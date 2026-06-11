#!/usr/bin/env node
/**
 * Asset_Pipeline — tối ưu mô hình GLB cho production.
 *
 * Script Node ESM chạy thủ công hoặc trong CI để tạo biến thể đã tối ưu của
 * Desktop_Model và chuẩn hóa hộp bao (bounding box) của nó.
 *
 * Quy trình (theo design "10. Asset pipeline"):
 *   1. Chạy `npx gltf-transform optimize <in.glb> <out.glb>`; kiểm tra mã thoát
 *      (exit code) và sự tồn tại của tệp đầu ra.                  (Req 2.1, 2.2)
 *   2. So sánh dung lượng: đầu ra phải ≤ nguồn; nếu lớn hơn → cảnh báo. (Req 2.1)
 *   3. Áp chuẩn hóa hộp bao (center→origin, maxDim→1.0) bằng transform tính
 *      theo cùng thuật toán với `lib/three/bbox.ts`
 *      (`computeNormalizationTransform`).                              (Req 2.4)
 *   4. Nếu lệnh thất bại (exit ≠ 0 hoặc thiếu output) hoặc chuẩn hóa lỗi → giữ
 *      nguyên tệp nguồn chưa tối ưu, phát thông báo lỗi rõ ràng và thoát với mã
 *      khác 0.                                                         (Req 2.7)
 *
 * Cách dùng:
 *   node scripts/optimize-assets.mjs
 *   node scripts/optimize-assets.mjs <input.glb> <output.glb>
 *
 * _Requirements: 2.1, 2.2, 2.4, 2.7_
 */

import { spawnSync } from "node:child_process";
import { existsSync, statSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

/** Đường dẫn mặc định cho Desktop_Model (Req 2.2). */
const DEFAULT_SOURCE = resolve(
  PROJECT_ROOT,
  "public/models/programmer_desktop_3d_pc.glb",
);
const DEFAULT_OUTPUT = resolve(
  PROJECT_ROOT,
  "public/models/programmer-desktop.optimized.glb",
);

/** Dung sai khớp với `lib/three/bbox.ts` và Req 2.4. */
const NORMALIZE_TOLERANCE = 0.001;

// ---------------------------------------------------------------------------
// Tiện ích log
// ---------------------------------------------------------------------------

/** @param {string} msg */
const info = (msg) => console.log(`[optimize-assets] ${msg}`);
/** @param {string} msg */
const warn = (msg) => console.warn(`[optimize-assets] ⚠ ${msg}`);
/** @param {string} msg */
const error = (msg) => console.error(`[optimize-assets] ✖ ${msg}`);

/** Thoát với lỗi: giữ nguyên nguồn, in thông điệp rõ ràng (Req 2.7). */
function failKeepingSource(message) {
  error(message);
  error("Quá trình tối ưu đã thất bại — giữ nguyên tệp nguồn chưa tối ưu.");
  process.exit(1);
}

/**
 * Tính `NormalizationTransform` đưa tâm hộp bao về gốc toạ độ và chuẩn hóa cạnh
 * lớn nhất về `1.0`.
 *
 * Port thuần JS của `computeNormalizationTransform` trong `lib/three/bbox.ts`
 * (script `.mjs` không thể import trực tiếp module TypeScript lúc chạy). Thuật
 * toán phải giữ đồng nhất: `pNew = (p + translate) * scale`.
 *
 * @param {{ min: [number, number, number], max: [number, number, number] }} bbox
 * @returns {{ translate: [number, number, number], scale: number }}
 */
function computeNormalizationTransform(bbox) {
  const IDENTITY = { translate: [0, 0, 0], scale: 1 };
  const { min, max } = bbox;

  const allFinite = [...min, ...max].every((v) => Number.isFinite(v));
  if (!allFinite) return IDENTITY;

  const center = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  const sizeX = Math.abs(max[0] - min[0]);
  const sizeY = Math.abs(max[1] - min[1]);
  const sizeZ = Math.abs(max[2] - min[2]);
  const maxEdge = Math.max(sizeX, sizeY, sizeZ);

  if (maxEdge <= 0 || !Number.isFinite(maxEdge)) {
    return { translate: [-center[0], -center[1], -center[2]], scale: 1 };
  }

  return {
    translate: [-center[0], -center[1], -center[2]],
    scale: 1 / maxEdge,
  };
}

// ---------------------------------------------------------------------------
// Bước 1–2: chạy gltf-transform optimize + xác minh
// ---------------------------------------------------------------------------

/**
 * Chạy `npx gltf-transform optimize <in> <out>` và xác minh exit code + output.
 * @param {string} source
 * @param {string} output
 */
function runOptimize(source, output) {
  info(`Tối ưu: ${source}`);
  info(`     →  ${output}`);

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    npxCmd,
    ["gltf-transform", "optimize", source, output],
    { stdio: "inherit", shell: process.platform === "win32" },
  );

  // Không spawn được tiến trình (ví dụ thiếu npx).
  if (result.error) {
    failKeepingSource(
      `Không thể chạy 'npx gltf-transform optimize': ${result.error.message}`,
    );
  }

  // Exit code khác 0 (Req 2.7).
  if (result.status !== 0) {
    // Dọn tệp đầu ra dở dang nếu có để không lẫn với bản hợp lệ.
    if (existsSync(output)) {
      try {
        rmSync(output);
      } catch {
        /* bỏ qua lỗi dọn dẹp */
      }
    }
    failKeepingSource(
      `Lệnh 'gltf-transform optimize' kết thúc với mã thoát ${result.status}.`,
    );
  }

  // Không tạo được tệp đầu ra (Req 2.7).
  if (!existsSync(output)) {
    failKeepingSource(
      `Lệnh 'gltf-transform optimize' không tạo được tệp đầu ra tại: ${output}`,
    );
  }
}

/**
 * So sánh dung lượng tệp đầu ra với nguồn; cảnh báo nếu đầu ra lớn hơn (Req 2.1).
 * @param {string} source
 * @param {string} output
 */
function compareSizes(source, output) {
  const sourceSize = statSync(source).size;
  const outputSize = statSync(output).size;
  const fmt = (n) => `${(n / 1024).toFixed(1)} KiB`;

  info(`Dung lượng nguồn : ${fmt(sourceSize)}`);
  info(`Dung lượng đầu ra: ${fmt(outputSize)}`);

  if (outputSize > sourceSize) {
    warn(
      `Biến thể đã tối ưu (${fmt(outputSize)}) LỚN HƠN tệp nguồn (${fmt(
        sourceSize,
      )}). Cần xem lại cấu hình tối ưu (Req 2.1).`,
    );
  } else {
    const saved = sourceSize - outputSize;
    const pct = sourceSize > 0 ? ((saved / sourceSize) * 100).toFixed(1) : "0";
    info(`Đã giảm ${fmt(saved)} (${pct}%).`);
  }
}

// ---------------------------------------------------------------------------
// Bước 3: chuẩn hóa hộp bao (center→origin, maxDim→1.0)
// ---------------------------------------------------------------------------

/**
 * Đọc GLB đầu ra, đo Box3 của scene, tính NormalizationTransform và ghi lại
 * dưới dạng một node bao (wrapper) chứa scale + translation, sau đó ghi đè GLB.
 *
 * Áp dụng `pNew = (p + translate) * scale`. Với một node không xoay:
 *   pNew = scale * p + nodeTranslation
 * nên đặt `nodeTranslation = scale * translate` để đạt `scale * (p + translate)`.
 *
 * Dùng `@gltf-transform/core` (nạp động để script vẫn parse được khi gói chưa
 * cài). Mọi lỗi → giữ nguyên nguồn + thoát khác 0 (Req 2.4, 2.7).
 *
 * @param {string} output
 */
async function normalizeBoundingBox(output) {
  let core;
  try {
    core = await import("@gltf-transform/core");
  } catch (e) {
    failKeepingSource(
      `Không nạp được '@gltf-transform/core' để chuẩn hóa hộp bao: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return;
  }

  const { NodeIO, getBounds, bounds } = core;

  try {
    const io = new NodeIO();
    const document = await io.read(output);
    const root = document.getRoot();
    const scene = root.getDefaultScene() ?? root.listScenes()[0];

    if (!scene) {
      failKeepingSource("GLB đầu ra không chứa scene nào để chuẩn hóa.");
      return;
    }

    // Đo hộp bao thế giới của scene. API tên hàm khác nhau giữa các phiên bản
    // (`getBounds` mới / `bounds` cũ) nên thử lần lượt.
    const boundsFn = getBounds ?? bounds;
    if (typeof boundsFn !== "function") {
      failKeepingSource(
        "Không tìm thấy hàm đo bounds trong '@gltf-transform/core'.",
      );
      return;
    }

    const sceneBounds = boundsFn(scene);
    const bbox = {
      min: [sceneBounds.min[0], sceneBounds.min[1], sceneBounds.min[2]],
      max: [sceneBounds.max[0], sceneBounds.max[1], sceneBounds.max[2]],
    };

    const { translate, scale } = computeNormalizationTransform(bbox);
    info(
      `Hộp bao: min=[${bbox.min.join(", ")}] max=[${bbox.max.join(", ")}]`,
    );
    info(`Transform chuẩn hóa: scale=${scale}, translate=[${translate.join(", ")}]`);

    // Tạo node bao mang transform chuẩn hóa và reparent các node gốc của scene.
    const wrapper = document
      .createNode("normalized-root")
      .setScale([scale, scale, scale])
      .setTranslation([
        scale * translate[0],
        scale * translate[1],
        scale * translate[2],
      ]);

    for (const node of scene.listChildren()) {
      scene.removeChild(node);
      wrapper.addChild(node);
    }
    scene.addChild(wrapper);

    await io.write(output, document);

    // Xác minh kết quả nằm trong dung sai (Req 2.4).
    const verifyDoc = await io.read(output);
    const verifyScene =
      verifyDoc.getRoot().getDefaultScene() ??
      verifyDoc.getRoot().listScenes()[0];
    const after = boundsFn(verifyScene);
    const centerAfter = [
      (after.min[0] + after.max[0]) / 2,
      (after.min[1] + after.max[1]) / 2,
      (after.min[2] + after.max[2]) / 2,
    ];
    const maxEdgeAfter = Math.max(
      Math.abs(after.max[0] - after.min[0]),
      Math.abs(after.max[1] - after.min[1]),
      Math.abs(after.max[2] - after.min[2]),
    );

    const centered = centerAfter.every(
      (c) => Math.abs(c) <= NORMALIZE_TOLERANCE,
    );
    const unitSized = Math.abs(maxEdgeAfter - 1.0) <= NORMALIZE_TOLERANCE;

    if (!centered || !unitSized) {
      warn(
        `Kết quả chuẩn hóa lệch dung sai (center=[${centerAfter.join(
          ", ",
        )}], maxEdge=${maxEdgeAfter}). Cần kiểm tra lại mô hình.`,
      );
    } else {
      info(
        `Chuẩn hóa hợp lệ: tâm ≈ gốc (±${NORMALIZE_TOLERANCE}), cạnh lớn nhất = 1.0.`,
      );
    }
  } catch (e) {
    failKeepingSource(
      `Lỗi khi chuẩn hóa hộp bao: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Điểm vào
// ---------------------------------------------------------------------------

async function main() {
  const [, , argSource, argOutput] = process.argv;
  const source = argSource ? resolve(process.cwd(), argSource) : DEFAULT_SOURCE;
  const output = argOutput ? resolve(process.cwd(), argOutput) : DEFAULT_OUTPUT;

  if (!existsSync(source)) {
    failKeepingSource(`Không tìm thấy tệp nguồn: ${source}`);
  }

  runOptimize(source, output);
  compareSizes(source, output);
  await normalizeBoundingBox(output);

  info("Hoàn tất tối ưu tài sản.");
}

main().catch((e) => {
  failKeepingSource(
    `Lỗi không mong đợi: ${e instanceof Error ? e.stack ?? e.message : String(e)}`,
  );
});
