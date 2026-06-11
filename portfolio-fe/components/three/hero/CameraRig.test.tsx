/**
 * Render test cho `CameraRig` ở chế độ Reduced_Motion_Mode.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (không cần
 * WebGL context thực), theo pattern của `Lighting.test.tsx`.
 *
 * Trọng tâm (Req 6.3): khi `reducedMotion` bật thì CameraRig:
 *  - KHÔNG đăng ký listener `pointermove` / `touchmove` (effect early-return),
 *  - giữ camera tại vị trí gốc dù các frame có được tiến tới (useFrame
 *    early-return → `camera.position` không đổi).
 *
 * Lưu ý về test-renderer: phần tử cha của `gl.domElement` có thể là `null`
 * trong môi trường headless. Vì vậy phép kiểm "không gắn listener" được thực
 * hiện bằng cách spy `addEventListener` ở cấp prototype của `HTMLElement` và
 * xác nhận không có lời gọi cho các sự kiện liên quan — điều này đúng vì nhánh
 * `reducedMotion` early-return TRƯỚC khi truy cập phần tử cha. Phép kiểm chính
 * còn lại là camera giữ nguyên vị trí sau khi tiến nhiều frame.
 *
 * _Requirements: 6.3_
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { useThree } from "@react-three/fiber";
import type { Camera } from "three";

import { CameraRig } from "./CameraRig";

/**
 * Probe headless: dùng `useThree` để lộ camera của scene ra ngoài qua callback,
 * cho phép test đọc/so sánh `camera.position`. Không render mesh hiển thị.
 */
function CameraProbe({ onReady }: { onReady: (camera: Camera) => void }) {
  const camera = useThree((s) => s.camera);
  onReady(camera);
  return null;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CameraRig (reduced motion)", () => {
  it("does not attach pointer/touch listeners when reducedMotion is true", async () => {
    const addSpy = vi.spyOn(window.HTMLElement.prototype, "addEventListener");

    const renderer = await ReactThreeTestRenderer.create(
      <CameraRig reducedMotion={true} />,
    );

    const relevantCalls = addSpy.mock.calls.filter(
      ([type]) => type === "pointermove" || type === "touchmove",
    );
    expect(relevantCalls).toHaveLength(0);

    await ReactThreeTestRenderer.act(async () => {
      await renderer.unmount();
    });
  });

  it("keeps the camera at its base position after advancing frames", async () => {
    let camera: Camera | null = null;

    const renderer = await ReactThreeTestRenderer.create(
      <>
        <CameraRig reducedMotion={true} />
        <CameraProbe onReady={(c) => (camera = c)} />
      </>,
    );

    expect(camera).not.toBeNull();
    const cam = camera as unknown as Camera;

    // Vị trí gốc của camera trước khi tiến frame.
    const baseX = cam.position.x;
    const baseY = cam.position.y;
    const baseZ = cam.position.z;

    // Tiến nhiều frame để kích hoạt useFrame; nhánh reducedMotion early-return
    // nên camera KHÔNG được dịch chuyển (Req 6.3).
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(5, 16);
    });

    expect(cam.position.x).toBe(baseX);
    expect(cam.position.y).toBe(baseY);
    expect(cam.position.z).toBe(baseZ);

    await ReactThreeTestRenderer.act(async () => {
      await renderer.unmount();
    });
  });
});
