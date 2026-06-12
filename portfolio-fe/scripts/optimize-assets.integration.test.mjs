/**
 * Integration test for `scripts/optimize-assets.mjs` (Asset_Pipeline).
 *
 * Feature: portfolio-3d-asset-suite — Task 19.3
 *
 * Validates the end-to-end behaviour of the optimize script against the two
 * contracts called out by the spec:
 *
 *   - Req 2.1: running the pipeline on a source GLB produces an optimized
 *     output whose file size is `≤` the source size.
 *   - Req 2.7: when `npx gltf-transform optimize` fails (non-zero exit code or
 *     a missing output file), the source is kept untouched, a clear error is
 *     emitted, and the process exits with a non-zero code.
 *
 * The real `gltf-transform` CLI and `@gltf-transform/core` package are NOT
 * required by this test. To keep the test hermetic and fast we:
 *   1. Put a fake `npx` on `PATH` whose behaviour is driven by `FAKE_NPX_MODE`
 *      (success / fail / no-output), so we can exercise both the happy path and
 *      the CLI-failure paths deterministically.
 *   2. Redirect the dynamic `import("@gltf-transform/core")` to a tiny in-memory
 *      stub via an ESM loader, so the bounding-box normalization step completes
 *      without the real (uninstalled) dependency.
 *
 * _Requirements: 2.1, 2.7_
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  statSync,
  readFileSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, 'optimize-assets.mjs');

/** Bytes written for the fake "source" GLB — must be larger than any output. */
const SOURCE_BYTES = 8192;
const SOURCE_CONTENT = Buffer.alloc(SOURCE_BYTES, 0x42); // 8 KiB of 'B'

/** Temp sandbox holding fixtures, the fake `npx`, the loader and the stub. */
let sandbox;
let binDir;
let sourcePath;
let outputPath;
let registerPath;
let stubPath;

// ---------------------------------------------------------------------------
// Fake `npx` — behaviour selected at runtime via FAKE_NPX_MODE.
//   args received from the script: gltf-transform optimize <in> <out>
// ---------------------------------------------------------------------------
const FAKE_NPX = `#!/usr/bin/env bash
out="\${@: -1}"
case "$FAKE_NPX_MODE" in
  success)
    # Produce an "optimized" file that is smaller than the source.
    printf 'OPTIMIZED' > "$out"
    exit 0
    ;;
  fail)
    # Write a partial/garbage output then fail with a non-zero exit code.
    printf 'PARTIAL-GARBAGE' > "$out"
    exit 3
    ;;
  no-output)
    # Exit cleanly but never create the output file.
    exit 0
    ;;
  *)
    echo "fake-npx: unknown FAKE_NPX_MODE='$FAKE_NPX_MODE'" >&2
    exit 99
    ;;
esac
`;

// ---------------------------------------------------------------------------
// Stub for `@gltf-transform/core` — just enough surface for the normalization
// step in optimize-assets.mjs. It round-trips bounds through module state so
// the script's post-write verification reports a valid (unit, centered) box.
// ---------------------------------------------------------------------------
const STUB_CORE = `
import { writeFileSync } from 'node:fs';

const store = new Map();

class StubNode {
  constructor(name) {
    this.name = name;
    this._scale = [1, 1, 1];
    this._translation = [0, 0, 0];
    this._children = [];
  }
  setScale(s) { this._scale = s; return this; }
  setTranslation(t) { this._translation = t; return this; }
  addChild(n) { this._children.push(n); return this; }
}

class StubScene {
  constructor(bounds) {
    this.__bounds = bounds;
    this._children = [new StubNode('original')];
  }
  listChildren() { return [...this._children]; }
  removeChild(n) { this._children = this._children.filter((c) => c !== n); return this; }
  addChild(n) { this._children.push(n); return this; }
}

class StubRoot {
  constructor(scene) { this._scene = scene; }
  getDefaultScene() { return this._scene; }
  listScenes() { return [this._scene]; }
}

class StubDocument {
  constructor(bounds) {
    this._scene = new StubScene(bounds);
    this._root = new StubRoot(this._scene);
  }
  getRoot() { return this._root; }
  createNode(name) { return new StubNode(name); }
}

const TWO_UNIT_BOX = { min: [-1, -1, -1], max: [1, 1, 1] };
const UNIT_BOX = { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] };

export class NodeIO {
  async read(path) {
    const bounds = store.get(path) ?? TWO_UNIT_BOX;
    return new StubDocument(bounds);
  }
  async write(path, doc) {
    const scene = doc.getRoot().getDefaultScene();
    const normalized = scene
      .listChildren()
      .some((n) => Array.isArray(n._scale) && n._scale[0] !== 1);
    store.set(path, normalized ? UNIT_BOX : TWO_UNIT_BOX);
    writeFileSync(path, Buffer.from('STUBGLB'));
  }
}

export function getBounds(scene) {
  return scene.__bounds ?? TWO_UNIT_BOX;
}
`;

// ESM loader that redirects `@gltf-transform/core` to the stub file.
const LOADER = `
import { pathToFileURL } from 'node:url';
const STUB = process.env.GLTF_CORE_STUB;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@gltf-transform/core') {
    return { url: pathToFileURL(STUB).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

const REGISTER = `
import { register } from 'node:module';
register('./loader.mjs', import.meta.url);
`;

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'optimize-assets-it-'));
  binDir = join(sandbox, 'bin');
  mkdirSync(binDir, { recursive: true });

  sourcePath = join(sandbox, 'programmer_desktop_3d_pc.glb');
  outputPath = join(sandbox, 'programmer-desktop.optimized.glb');
  registerPath = join(sandbox, 'register.mjs');
  stubPath = join(sandbox, 'stub-core.mjs');

  writeFileSync(sourcePath, SOURCE_CONTENT);

  const npxPath = join(binDir, 'npx');
  writeFileSync(npxPath, FAKE_NPX);
  chmodSync(npxPath, 0o755);

  writeFileSync(stubPath, STUB_CORE);
  writeFileSync(join(sandbox, 'loader.mjs'), LOADER);
  writeFileSync(registerPath, REGISTER);
});

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

/**
 * Runs optimize-assets.mjs in a child process with a controlled environment.
 * @param {'success'|'fail'|'no-output'} mode
 */
function runScript(mode) {
  return spawnSync(
    process.execPath,
    ['--import', registerPath, SCRIPT_PATH, sourcePath, outputPath],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ''}`,
        FAKE_NPX_MODE: mode,
        GLTF_CORE_STUB: stubPath,
      },
    },
  );
}

describe('optimize-assets.mjs integration', () => {
  it('produces an output that is ≤ the source size on success (Req 2.1)', () => {
    // Start from a clean slate.
    if (existsSync(outputPath)) rmSync(outputPath);
    writeFileSync(sourcePath, SOURCE_CONTENT);

    const result = runScript('success');
    const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    expect(result.status, combined).toBe(0);

    // Output exists ...
    expect(existsSync(outputPath)).toBe(true);

    // ... and its size is ≤ the source size (Req 2.1).
    const sourceSize = statSync(sourcePath).size;
    const outputSize = statSync(outputPath).size;
    expect(outputSize).toBeLessThanOrEqual(sourceSize);

    // The size comparison step ran and reported a reduction.
    expect(combined).toContain('[optimize-assets]');
    expect(combined).toContain('Hoàn tất tối ưu');

    // The source GLB is left intact.
    expect(existsSync(sourcePath)).toBe(true);
    expect(statSync(sourcePath).size).toBe(SOURCE_BYTES);
  });

  it('keeps the source, errors clearly, and exits non-zero when the CLI fails (Req 2.7)', () => {
    if (existsSync(outputPath)) rmSync(outputPath);
    writeFileSync(sourcePath, SOURCE_CONTENT);

    const result = runScript('fail');
    const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    // Non-zero exit code.
    expect(result.status, combined).not.toBe(0);
    expect(result.status).toBeGreaterThan(0);

    // Clear error message indicating optimization failed + source kept.
    expect(result.stderr).toContain('✖');
    expect(result.stderr).toContain('giữ nguyên tệp nguồn');

    // Source is preserved unchanged.
    expect(existsSync(sourcePath)).toBe(true);
    expect(readFileSync(sourcePath).equals(SOURCE_CONTENT)).toBe(true);

    // The partial/garbage output is cleaned up so it cannot be mistaken for a
    // valid optimized asset.
    expect(existsSync(outputPath)).toBe(false);
  });

  it('keeps the source, errors clearly, and exits non-zero when no output is produced (Req 2.7)', () => {
    if (existsSync(outputPath)) rmSync(outputPath);
    writeFileSync(sourcePath, SOURCE_CONTENT);

    const result = runScript('no-output');
    const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    // Non-zero exit code.
    expect(result.status, combined).not.toBe(0);
    expect(result.status).toBeGreaterThan(0);

    // Clear error message about the missing output + source kept.
    expect(result.stderr).toContain('✖');
    expect(result.stderr).toContain('không tạo được tệp đầu ra');
    expect(result.stderr).toContain('giữ nguyên tệp nguồn');

    // Source preserved, no output file left behind.
    expect(existsSync(sourcePath)).toBe(true);
    expect(readFileSync(sourcePath).equals(SOURCE_CONTENT)).toBe(true);
    expect(existsSync(outputPath)).toBe(false);
  });
});
