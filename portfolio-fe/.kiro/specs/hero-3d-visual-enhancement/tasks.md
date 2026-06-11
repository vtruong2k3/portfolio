# Implementation Plan: Hero 3D Visual Enhancement

## Overview

Kế hoạch triển khai biến cảnh 3D Hero thành cảnh cao cấp theo thiết kế đã duyệt. Cách tiếp cận: hiện thực trước toàn bộ **lớp logic thuần** trong `lib/three/` kèm các property-based test (fast-check + vitest, tối thiểu 100 vòng/test), sau đó mới dựng các component R3F mỏng tiêu thụ các hàm thuần này, cuối cùng là wrapper động, fallback và các render/accessibility test.

Ngôn ngữ triển khai: **TypeScript** (theo thiết kế). Công cụ test: **vitest** (`jsdom`, `globals: true`), **fast-check**, **@testing-library/react**, **vitest-axe**. Chạy test bằng `npm run test` (đã map sang `vitest run`, không dùng watch mode).

Mỗi property test PHẢI gắn comment theo định dạng:
`// Feature: hero-3d-visual-enhancement, Property {number}: {property_text}` và chạy với `{ numRuns: 100 }` (tối thiểu).

## Tasks

- [x] 1. Cài đặt phụ thuộc và nền tảng dự án
  - [x] 1.1 Cài `@react-three/postprocessing` và tạo bảng màu
    - Cài `@react-three/postprocessing` (ghim phiên bản chính xác, xác nhận tương thích peer với `@react-three/fiber` v9 và `three` ^0.184)
    - Tạo `lib/three/palette.ts` export hằng số `PALETTE` gồm đúng 4 mã màu cyan `#22d3ee`, violet `#a855f7`, blue `#3b82f6`, pink `#ec4899` và type `PaletteColor`
    - _Requirements: 1.3_

  - [x] 1.2 Viết unit test cho bảng màu
    - Xác nhận `PALETTE` chứa đúng 4 mã màu và đúng giá trị hex
    - _Requirements: 1.3_

- [x] 2. Hiện thực module quản lý chất lượng đồ họa (`lib/three/graphicsTier.ts`)
  - [x] 2.1 Tạo type, preset và các hàm thuần chọn/hạ tier
    - Định nghĩa `GraphicsTier`, `DeviceSignals`, `TierPreset`, `TIER_ORDER`, `TIER_PRESETS`, `TIER_THRESHOLDS`
    - Hiện thực `selectInitialTier(signals)` (thuần, tất định, ép `low` khi tín hiệu dưới ngưỡng; mặc định thận trọng khi thiếu `logicalCores`)
    - Hiện thực `clampDpr(rawDpr, tier)`, `downgradeTier(current)`, `getPreset(tier)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.4, 1.4, 2.4, 3.4, 3.5_

  - [x] 2.2 Viết property test cho `selectInitialTier`
    - **Property 1: Chọn tier luôn hợp lệ, tất định và ép `low` khi dưới ngưỡng**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 2.3 Viết property test cho `TIER_PRESETS`
    - **Property 2: Preset của mỗi tier hợp lệ và đơn điệu theo tier**
    - **Validates: Requirements 1.4, 2.4, 3.4, 3.5, 7.3, 7.5, 7.6**

  - [x] 2.4 Viết property test cho `clampDpr`
    - **Property 3: Giới hạn DPR theo trần của tier**
    - **Validates: Requirements 7.4**

  - [x] 2.5 Viết property test cho `downgradeTier`
    - **Property 4: Hạ tier đơn điệu, không bao giờ nâng**
    - **Validates: Requirements 8.4**

- [x] 3. Hiện thực module giám sát FPS (`lib/three/fpsMonitor.ts`)
  - [x] 3.1 Tạo logic trung bình FPS và quyết định hạ tier (thuần)
    - Định nghĩa `FpsMonitorConfig`, `FpsSample`, `FpsMonitorState`
    - Hiện thực `initFpsState()`, `pushSample(state, sample, config)` (không side-effect, đặt `shouldDowngrade` đúng một lần khi vượt `sustainedMs`), `averageFps(state)`
    - _Requirements: 8.1, 8.2_

  - [x] 3.2 Viết property test cho `pushSample`/`averageFps`
    - **Property 5: Giám sát FPS tính trung bình đúng và chỉ hạ tier khi thấp liên tục đủ lâu**
    - **Validates: Requirements 8.1, 8.2**

- [x] 4. Hiện thực module camera rig (`lib/three/cameraRig.ts`)
  - [x] 4.1 Tạo các hàm thuần tính mục tiêu parallax và nội suy
    - Định nghĩa `PointerInput`, `RigBounds`
    - Hiện thực `computeParallaxTarget(pointer, bounds)` (kẹp trong biên), `clampOffset(value, max)`, `lerp(current, target, alpha)`
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 4.2 Viết property test cho `computeParallaxTarget`
    - **Property 6: Mục tiêu camera parallax luôn nằm trong biên**
    - **Validates: Requirements 6.2, 6.4**

  - [x] 4.3 Viết property test cho `lerp`
    - **Property 7: Nội suy lerp nằm trong khoảng và hội tụ về mục tiêu**
    - **Validates: Requirements 6.1**

- [x] 5. Hiện thực module bố cục (`lib/three/composition.ts`)
  - [x] 5.1 Tạo các hàm thuần tính tỉ lệ vừa khung hình
    - Định nghĩa `ViewportInfo`
    - Hiện thực `computeFitScale(objectRadius, viewport)` (trả về trong `(0, 1]`), `visibleHalfHeight(viewport)`, `visibleHalfWidth(viewport)`
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.2 Viết property test cho `computeFitScale`
    - **Property 8: Tỉ lệ vừa khung giữ vật thể trung tâm trọn trong khung hình**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 6. Hiện thực module animation (`lib/three/animation.ts`)
  - [x] 6.1 Tạo các hàm thuần dao động và xoay theo delta-time
    - Định nghĩa `FloatConfig`, `RotationConfig`
    - Hiện thực `floatOffset(elapsedSec, config)` (`|kết quả| <= amplitude`), `advanceRotation(prevAngle, deltaSec, speed)` (delta-based), `reducedAmplitude(config, reduced)`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Viết property test cho `floatOffset`
    - **Property 9: Biên độ dao động trôi bị chặn bởi cấu hình**
    - **Validates: Requirements 5.1**

  - [x] 6.3 Viết property test cho `advanceRotation`
    - **Property 10: Chuyển động dựa trên delta-time độc lập với số khung hình**
    - **Validates: Requirements 5.2**

  - [x] 6.4 Viết property test cho `reducedAmplitude`
    - **Property 11: Chế độ giảm chuyển động làm giảm biên độ trong ngưỡng**
    - **Validates: Requirements 5.3**

- [x] 7. Hiện thực module WebGL guard và tương phản màu (`lib/three/webgl.ts`, `lib/three/contrast.ts`)
  - [x] 7.1 Tạo `isWebGLAvailable()` an toàn SSR
    - Hiện thực `isWebGLAvailable()` với guard `typeof window !== "undefined"`, không ném khi `window` undefined
    - _Requirements: 12.1, 10.2, 10.3_

  - [x] 7.2 Viết unit test cho `isWebGLAvailable`
    - Xác nhận không ném lỗi khi `window` undefined; trả `false` khi không có WebGL context
    - _Requirements: 10.2, 10.3, 12.1_

  - [x] 7.3 Tạo hàm tính tỉ lệ tương phản WCAG (`contrast.ts`)
    - Hiện thực `contrastRatio(fg, bg)` theo công thức luminance WCAG cho các token màu vùng nội dung Hero
    - _Requirements: 9.4_

  - [x] 7.4 Viết property test cho `contrastRatio`
    - **Property 14: Tương phản văn bản Hero đạt chuẩn WCAG AA**
    - **Validates: Requirements 9.4**

- [x] 8. Hiện thực logic thuần cho pipeline hậu kỳ (`lib/three/postProcessing.ts`)
  - [x] 8.1 Tạo hàm thuần dựng tập hiệu ứng và tham số tĩnh
    - Hiện thực `buildEnabledEffects({ enableBloom, enableVignette })` trả về tập hiệu ứng được bật độc lập
    - Hiện thực hàm tính tham số hậu kỳ (ví dụ cường độ bloom) trả giá trị tĩnh khi `reducedMotion === true`
    - _Requirements: 2.3, 2.5_

  - [x] 8.2 Viết property test cho `buildEnabledEffects`
    - **Property 12: Bật/tắt bloom và vignette độc lập nhau**
    - **Validates: Requirements 2.3**

  - [x] 8.3 Viết property test cho tham số hậu kỳ tĩnh
    - **Property 13: Tham số hậu kỳ tĩnh khi giảm chuyển động**
    - **Validates: Requirements 2.5**

- [x] 9. Checkpoint - Đảm bảo toàn bộ logic thuần và property test đạt
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Hiện thực các React hook tiêu thụ logic thuần
  - [x] 10.1 Tạo `hooks/usePrefersReducedMotion.ts`
    - Theo dõi `matchMedia("(prefers-reduced-motion: reduce)")` qua `useEffect` + guard client, cập nhật phản ứng khi trạng thái đổi (không reload)
    - _Requirements: 9.2, 10.2, 10.3_

  - [x] 10.2 Tạo `QualityProvider` và `hooks/useQualityTier.ts`
    - Tạo context lưu `tier`, `initialTier` (trần), `preset`, `requestDowngrade`; thu thập `DeviceSignals` qua client guard rồi gọi `selectInitialTier`; `requestDowngrade` dùng cập nhật dạng hàm `setTier(prev => downgradeTier(prev))` không vượt trần
    - _Requirements: 7.1, 8.3, 8.4, 10.2, 10.3_

  - [x] 10.3 Tạo `hooks/useFpsMonitor.ts`
    - Dùng `useFrame((_, delta) => pushSample(...))`; khi `shouldDowngrade` chuyển true gọi `onDowngrade()` đúng một lần rồi reset bộ đếm
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 10.4 Viết unit test cho `usePrefersReducedMotion`
    - Dispatch sự kiện `matchMedia` change và xác nhận state cập nhật không cần reload
    - _Requirements: 9.2_

- [x] 11. Hiện thực các component ánh sáng và môi trường (`hero/Lighting.tsx`)
  - [x] 11.1 Dựng key/fill/ambient + environment và shadow theo tier
    - Thêm `ambientLight` + `Environment` (drei) để không có vùng tối tuyệt đối; `directionalLight` (key, cyan) + fill (violet/blue) thuộc `PALETTE`; bật `castShadow` khi `preset.shadows`, tắt ở tier `low`; bọc try/catch quanh từng đèn để lỗi một đèn không làm hỏng cảnh; chọn độ phân giải env map theo `preset.envMapResolution`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 1.2, 1.4_

  - [x] 11.2 Viết render test cho ánh sáng và chịu lỗi đèn
    - Xác nhận scene có key + fill + ambient/Environment màu thuộc `PALETTE`; mock buộc một đèn lỗi, scene vẫn render với các đèn còn lại
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 12. Hiện thực vật thể trung tâm và trang trí
  - [x] 12.1 Tạo `hero/CentralObject.tsx` (TorusKnot PBR + fit scale)
    - Dùng vật liệu PBR (`meshStandardMaterial`/`meshPhysicalMaterial`) với `metalness`/`roughness` rõ ràng và environment reflection; đọc `useThree().viewport`/`size` + `camera`, gọi `computeFitScale` đặt `scale`, cập nhật khi viewport đổi; áp dụng `floatOffset` + `advanceRotation` theo delta-time
    - _Requirements: 1.1, 1.2, 4.3, 4.4, 4.5, 5.1, 5.2_

  - [x] 12.2 Tạo `hero/Decorations.tsx` (orbs + rings)
    - Vật liệu PBR theo `PALETTE`; phân bố các vật thể phụ trên nhiều độ sâu trục Z, không che vùng văn bản chính; chuyển động trôi/xoay delta-based dùng `animation`
    - _Requirements: 1.1, 1.3, 4.1, 4.2, 5.1, 5.2_

  - [x] 12.3 Viết unit/render test cho vật liệu và bố cục
    - Xác nhận material là PBR có `metalness`/`roughness`; vị trí trang trí trải trên nhiều giá trị Z
    - _Requirements: 1.1, 4.2_

- [x] 13. Hiện thực trường hạt và nền sao
  - [x] 13.1 Tạo `hero/ParticleField.tsx` và Stars theo tier/reduced-motion
    - Mật độ hạt đọc từ `preset.particleCount`; Stars dùng `preset.starCount` và KHÔNG render khi `reducedMotion` bật; chuyển động delta-based
    - _Requirements: 5.4, 7.3_

  - [x] 13.2 Viết render test cho Stars khi reduced motion
    - Reduced motion bật → Stars không render
    - _Requirements: 5.4_

- [x] 14. Hiện thực camera rig component (`hero/CameraRig.tsx`)
  - [x] 14.1 Gắn parallax theo pointer/touch tiêu thụ `cameraRig`
    - Đăng ký `pointermove` + `touchmove` trên phần tử cha (gộp chuột + chạm), chuẩn hóa toạ độ về `[-1, 1]` chỉ sau mount client; mỗi frame `pos = lerp(pos, computeParallaxTarget(...), alpha)`, cập nhật `camera.position` + `camera.lookAt(0,0,0)`; khi `reducedMotion` không gắn listener và giữ camera tại gốc
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.2, 10.3_

  - [x] 14.2 Viết render test cho camera khi reduced motion
    - Reduced motion bật → không gắn listener, camera giữ vị trí gốc
    - _Requirements: 6.3_

- [x] 15. Hiện thực pipeline hậu kỳ component (`hero/PostProcessing.tsx`)
  - [x] 15.1 Dựng EffectComposer + Bloom + Vignette theo cờ và tier
    - Dùng `buildEnabledEffects` để thêm `<Bloom>`/`<Vignette>` độc lập; chỉ render khi `preset.postProcessing === true` (tier `low` tắt toàn bộ); giữ `alpha: true`, không vẽ nền đục; khi `reducedMotion` dùng tham số tĩnh từ `postProcessing`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 15.2 Viết render test cho pipeline hậu kỳ
    - EffectComposer chứa Bloom/Vignette theo cờ; tier `low` không render pipeline; Canvas giữ `alpha: true`
    - _Requirements: 2.1, 2.2, 2.4, 2.6_

- [x] 16. Lắp ráp nội dung cảnh (`hero/Scene.tsx`)
  - [x] 16.1 Ghép Lighting, CentralObject, Decorations, ParticleField, CameraRig, PostProcessing, FpsMonitor
    - Kết nối tất cả component con bên trong scene, gắn `useFpsMonitor` đẩy `requestDowngrade`, đọc preset từ `QualityProvider`, truyền `reducedMotion` xuống các component
    - _Requirements: 5.1, 5.2, 8.1, 8.2, 8.3_

- [x] 17. Checkpoint - Đảm bảo cảnh và các test render đạt
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Hiện thực Canvas wrapper, fallback và error boundary
  - [x] 18.1 Viết lại `HeroScene.tsx` với QualityProvider + WebGL guard + error boundary
    - Kiểm tra `isWebGLAvailable()` trước khi dựng `<Canvas>`; bọc `<Canvas>` trong `CanvasErrorBoundary` → lỗi runtime gọi `console.error` và chuyển `HeroFallback`; đặt `aria-hidden="true"`, không focusable, nền canvas trong suốt; áp `clampDpr` cho DPR và `antialias` theo tier
    - _Requirements: 7.4, 7.5, 7.6, 9.1, 9.3, 12.1, 12.2_

  - [x] 18.2 Tạo `HeroFallback.tsx` (nền tĩnh không WebGL)
    - `<div>` full-bleed `inset-0`, `aria-hidden`, nền gradient dùng đúng `PALETTE`, `pointer-events-none` để không chặn tương tác nội dung Hero
    - _Requirements: 12.3, 12.4_

  - [x] 18.3 Viết render test cho fallback và error boundary
    - Mock `isWebGLAvailable=false` → render fallback; lỗi trong Canvas → boundary render fallback + gọi `console.error`; fallback dùng `PALETTE`, `inset-0`, `pointer-events-none`; nút Hero vẫn click được
    - _Requirements: 8.3, 12.1, 12.2, 12.3, 12.4_

- [x] 19. Cập nhật wrapper động và hiệu ứng tải (`components/three/index.tsx`)
  - [x] 19.1 Dynamic import ssr:false + loading + fade-in
    - Trước khi viết mã `next/dynamic`, đọc hướng dẫn tương ứng trong `node_modules/next/dist/docs/`; wrapper `next/dynamic` với `ssr: false`, `loading` là chỉ báo chiếm trọn nền (`inset-0`); sau mount áp lớp fade-in (transition opacity) trong thời lượng cấu hình; bỏ qua fade-in khi `reducedMotion`
    - _Requirements: 10.1, 11.1, 11.2, 11.3_

  - [x] 19.2 Viết render test cho loading và fade-in
    - Loading chiếm `inset-0`; sau mount thêm transition opacity; reduced motion → bỏ fade-in
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 20. Kiểm tra tiếp cận tổng thể HeroSection
  - [x] 20.1 Viết accessibility test cho HeroSection
    - Render test xác nhận container cảnh `aria-hidden="true"`, không nhận keyboard focus; `vitest-axe` không vi phạm trên `HeroSection`; nội dung văn bản giữ tương phản đạt WCAG AA
    - _Requirements: 9.1, 9.3, 9.4_

- [x] 21. Checkpoint cuối - Đảm bảo toàn bộ test đạt
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Các task gắn `*` là tùy chọn (test) và có thể bỏ qua để ra MVP nhanh hơn; task triển khai cốt lõi không bao giờ được đánh dấu tùy chọn.
- Mỗi task tham chiếu các sub-requirement cụ thể để truy vết.
- Lớp logic thuần trong `lib/three/` được hiện thực và phủ property test TRƯỚC khi dựng các component R3F, nhằm bắt lỗi sớm và cho phép kiểm thử không cần WebGL context.
- 14 property test dùng fast-check với tối thiểu 100 vòng mỗi test và comment tham chiếu property theo định dạng `// Feature: hero-3d-visual-enhancement, Property N: ...`.
- Các checkpoint đảm bảo kiểm chứng tăng dần ở các điểm dừng hợp lý.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    {
      "id": 1,
      "tasks": ["1.2", "2.1", "3.1", "4.1", "5.1", "6.1", "7.1", "7.3", "8.1"]
    },
    {
      "id": 2,
      "tasks": [
        "2.2",
        "2.3",
        "2.4",
        "2.5",
        "3.2",
        "4.2",
        "4.3",
        "5.2",
        "6.2",
        "6.3",
        "6.4",
        "7.2",
        "7.4",
        "8.2",
        "8.3"
      ]
    },
    { "id": 3, "tasks": ["10.1", "10.2", "10.3"] },
    {
      "id": 4,
      "tasks": ["10.4", "11.1", "12.1", "12.2", "13.1", "14.1", "15.1"]
    },
    { "id": 5, "tasks": ["11.2", "12.3", "13.2", "14.2", "15.2"] },
    { "id": 6, "tasks": ["16.1"] },
    { "id": 7, "tasks": ["18.1", "18.2"] },
    { "id": 8, "tasks": ["18.3", "19.1"] },
    { "id": 9, "tasks": ["19.2", "20.1"] }
  ]
}
```
