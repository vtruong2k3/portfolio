# Implementation Plan: Portfolio 3D Asset Suite

## Overview

This plan implements the 3D Asset Suite for `portfolio-fe` (Next.js 16 + React 19 +
React Three Fiber) following a **pure-logic-core-first** approach. All deterministic
math (Motion_Config clamping, bounding-box normalization, asset-path resolution,
orbit math, carousel indexing, scroll-progress, slide direction, date formatting,
contrast, Earth flags) is implemented and property-tested in `lib/three/*` **before**
the R3F/DOM shell components that consume it.

The suite is **reuse-first**: it builds on the tested infrastructure from
`hero-3d-visual-enhancement` (QualityProvider, FPS monitor, WebGL guard,
CanvasErrorBoundary + HeroFallback, dynamic-import wrapper, Lighting,
PostProcessing, palette, contrast, composition, animation primitives) and the
existing data hooks (`use-projects`, `use-experiences`, `use-skills`,
`use-contact`) and `contactSchema`. No new tier/fallback/safety logic is created;
the shared safety frame is extracted into `SceneCanvas` from the existing `HeroScene`.

Language: **TypeScript** (matches the design). Tests run with `npm run test`
(`vitest run`, no watch) using `fast-check`, `@react-three/test-renderer`, and
`vitest-axe`.

Conventions:
- Each correctness property is implemented by **exactly one** property-based test
  (fast-check, ≥100 iterations), placed in its own file next to the module
  (matching the existing `animation.<fn>.test.ts` convention), and tagged in the
  describe/it comment as:
  `Feature: portfolio-3d-asset-suite, Property N: <property text>`.
- Test-related sub-tasks are marked optional with `*` and are NOT implemented by
  default; core implementation and wiring sub-tasks are always implemented.

## Tasks

- [x] 1. Motion config foundation and motion/composition reuse extensions
  - [x] 1.1 Create `lib/three/motionConfig.ts`
    - Define `MotionConfig`, `MOTION_LIMITS` ({ maxTranslation: 0.5, maxRotationRevPerSec: 0.1, minCyclePeriodSec: 4 })
    - Implement pure `clampMotionConfig`, `clampTranslation`, `clampRotationSpeed`, `clampCyclePeriod` (idempotent clamping to limits)
    - Implement pure `effectiveRotationSpeed(baseSpeed, reduced)` returning 0 when reduced, else clamped speed
    - _Requirements: 1.4, 1.5, 1.7, 6.7, 11.4_
  - [x] 1.2 Write property test for Motion_Config clamping
    - **Property 1: Motion_Config được kẹp về trong giới hạn và ổn định**
    - File `lib/three/motionConfig.clamp.test.ts`; assert clamped ranges and idempotence
    - **Validates: Requirements 1.4, 1.5, 1.7**
  - [x] 1.3 Write property test for effective rotation speed
    - **Property 8: Tốc độ quay liên tục bị kẹp và bằng 0 khi giảm chuyển động**
    - File `lib/three/motionConfig.effectiveRotationSpeed.test.ts`
    - **Validates: Requirements 6.7, 11.4**
  - [x] 1.4 Extend `lib/three/composition.ts` `computeFitScale`
    - Ensure returned scale `s ∈ (0, 1]` fits both `visibleHalfHeight` AND `visibleHalfWidth` so the object is never clipped at any edge across viewport sizes
    - _Requirements: 4.3, 4.4_
  - [x] 1.5 Write property test for fit-scale (no clipping)
    - **Property 5: Vật thể trung tâm luôn vừa khung hình không bị cắt**
    - File `lib/three/composition.fitScale.test.ts`
    - **Validates: Requirements 4.3, 4.4**
  - [x] 1.6 Write property test for delta-time rotation (FPS independence)
    - **Property 2: Chuyển động theo delta-time độc lập với FPS**
    - Extend `lib/three/animation.advanceRotation.test.ts`; split-vs-single-step equality within float tolerance
    - **Validates: Requirements 1.6, 6.4**
  - [x] 1.7 Write property test for reduced-motion amplitude clamping
    - **Property 6: Reduced_Motion_Mode kẹp biên độ dao động**
    - Extend `lib/three/animation.reducedAmplitude.test.ts`; amplitude ≤ original and ≤ REDUCED_AMPLITUDE_MAX (0.05); identity when not reduced
    - **Validates: Requirements 4.6**

- [x] 2. Bounding-box normalization and asset-path resolution
  - [x] 2.1 Create `lib/three/bbox.ts`
    - Define `BoundingBox`, `NormalizationTransform`; implement pure `computeNormalizationTransform(bbox)` that centers box at origin and normalizes largest edge to 1.0
    - _Requirements: 2.4_
  - [x] 2.2 Write property test for bbox normalization
    - **Property 3: Chuẩn hóa bounding box về tâm gốc và kích thước đơn vị**
    - File `lib/three/bbox.test.ts`; center within ±0.001 and max edge == 1.0 ±0.001 (exclude degenerate boxes via precondition)
    - **Validates: Requirements 2.4**
  - [x] 2.3 Create `lib/three/assetPath.ts`
    - Define `AssetPaths`; implement pure `resolveModelPath(name, optimizedExists)` returning optimized path when present, else source path with `optimizedMissing = true`
    - _Requirements: 2.5, 2.8_
  - [x] 2.4 Write property test for model-path resolution
    - **Property 4: Ưu tiên biến thể đã tối ưu, fallback về nguồn**
    - File `lib/three/assetPath.test.ts`
    - **Validates: Requirements 2.5, 2.8**

- [x] 3. Terminal cursor and Earth enable/rotation pure logic
  - [x] 3.1 Create `lib/three/terminal.ts`
    - Implement pure `cursorVisible(elapsedSec, periodSec, reduced)` — periodic with half-period "on" when not reduced; constant when reduced
    - _Requirements: 5.3, 5.5, 10.2_
  - [x] 3.2 Write property test for blinking cursor
    - **Property 7: Con trỏ nhấp nháy tất định và tĩnh khi giảm chuyển động**
    - File `lib/three/terminal.test.ts`; period ∈ [0.5, 1.0]; constant output when reduced
    - **Validates: Requirements 5.3, 5.5, 10.2**
  - [x] 3.3 Create `lib/three/earth.ts`
    - Implement pure `isEarthEnabled(tier, flag)` (true iff tier ≠ low and flag on); export `EARTH_ROTATION_DEG_PER_SEC` constant within [0.5, 2]
    - _Requirements: 11.1, 11.5_
  - [x] 3.4 Write property test for Earth enable/rotation
    - **Property 23: Earth_Globe — tốc độ xoay trong dải và bị tắt ở tier thấp**
    - File `lib/three/earth.test.ts`
    - **Validates: Requirements 11.1, 11.5**

- [x] 4. Tech-icon orbit pure logic
  - [x] 4.1 Create `lib/three/orbit.ts`
    - Define `OrbitParams`, `OrbitTransform`; implement pure `computeOrbitPosition({ index, total, radius, elapsedSec, reduced })` — equal angular spacing (360/total), point on circle of `radius`, vertical float within ±0.05, static base position when reduced
    - Implement pure `selectCardCount(available, tier)` returning value in [6, 8], ≤ available, ≤ 6 when tier low
    - Implement pure billboard orientation helper (normal vs camera-direction within 1°)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10, 7.13_
  - [x] 4.2 Write property test for orbit placement
    - **Property 9: Quỹ đạo Tech_Icon — cách đều, nằm trên đường tròn, bay trong biên**
    - File `lib/three/orbit.position.test.ts`
    - **Validates: Requirements 7.3, 7.5, 7.6, 7.13**
  - [x] 4.3 Write property test for orbit reduced-motion stillness
    - **Property 10: Quỹ đạo Tech_Icon đứng yên khi giảm chuyển động**
    - File `lib/three/orbit.reduced.test.ts`
    - **Validates: Requirements 7.9**
  - [x] 4.4 Write property test for billboard orientation
    - **Property 11: Tech_Icon billboard hướng về camera**
    - File `lib/three/orbit.billboard.test.ts`; deviation ≤ 1°
    - **Validates: Requirements 7.4**
  - [x] 4.5 Write property test for card count selection
    - **Property 12: Số lượng thẻ kỹ năng nằm trong khoảng hợp lệ**
    - File `lib/three/orbit.selectCardCount.test.ts`
    - **Validates: Requirements 7.2, 7.10**

- [x] 5. Project carousel pure logic
  - [x] 5.1 Create `lib/three/carousel.ts`
    - Define `CarouselState`, `CardPlacement`; implement pure `computeCardPlacement` (center scale 1.1–1.3 and is max; non-center opacity 0.4–0.6)
    - Implement pure `navigate(state, dir)` and `wrapIndex(i, total)` (wrap into [0, total)); next-then-prev returns original center
    - Implement pure `resolveProjectImage(project)` (placeholder iff thumbnail null and images empty) and pure GitHub/Demo link-visibility helper (visible iff URL ≠ null)
    - _Requirements: 8.3, 8.5, 8.6, 8.7, 8.13_
  - [x] 5.2 Write property test for card placement
    - **Property 13: Bố trí thẻ Project_Carousel — tỉ lệ và độ mờ trong biên**
    - File `lib/three/carousel.placement.test.ts`
    - **Validates: Requirements 8.3**
  - [x] 5.3 Write property test for carousel index mapping
    - **Property 14: Ánh xạ chỉ số Project_Carousel tất định và khả nghịch**
    - File `lib/three/carousel.navigate.test.ts`
    - **Validates: Requirements 8.5, 8.6**
  - [x] 5.4 Write property test for link-button visibility
    - **Property 15: Hiển thị nút liên kết theo dữ liệu Project**
    - File `lib/three/carousel.links.test.ts`
    - **Validates: Requirements 8.7**
  - [x] 5.5 Write property test for placeholder image resolution
    - **Property 16: Ảnh placeholder khi không có ảnh dự án**
    - File `lib/three/carousel.image.test.ts`
    - **Validates: Requirements 8.13**

- [x] 6. Experience timeline pure logic
  - [x] 6.1 Create `lib/three/timeline.ts`
    - Define `ScrollInput`, `SlideDirection`; implement pure `sortExperiences` (asc by `order`, tie-break desc by `startDate`, permutation of input)
    - Implement pure `normalizeScrollProgress(input)` ∈ [0,1], non-decreasing in scrollTop, 0 before start / 1 after end
    - Implement pure `slideDirection(index)` ("left" even, "right" odd) and `formatDateRange(experience)` ("Present" iff endDate null)
    - _Requirements: 9.2, 9.4, 9.5, 9.7, 9.9_
  - [x] 6.2 Write property test for experience sorting
    - **Property 17: Sắp xếp Experience theo order rồi startDate**
    - File `lib/three/timeline.sort.test.ts`
    - **Validates: Requirements 9.2**
  - [x] 6.3 Write property test for normalized scroll progress
    - **Property 18: Tiến độ cuộn chuẩn hóa trong [0,1] và đơn điệu**
    - File `lib/three/timeline.scroll.test.ts`
    - **Validates: Requirements 9.4, 9.7**
  - [x] 6.4 Write property test for slide direction
    - **Property 19: Hướng trượt thẻ timeline theo chẵn/lẻ**
    - File `lib/three/timeline.slide.test.ts`
    - **Validates: Requirements 9.5**
  - [x] 6.5 Write property test for date-range formatting
    - **Property 20: Định dạng khoảng thời gian dùng "Present" khi đang làm việc**
    - File `lib/three/timeline.dateRange.test.ts`
    - **Validates: Requirements 9.9**

- [x] 7. Contrast, contact validation, and performance reuse coverage
  - [x] 7.1 Extend `lib/three/contrast.ts` with Asset_Suite color-pair set
    - Add the concrete (foreground, background) color pairs used by timeline cards, interactive text, and text adjacent to Earth_Globe for WCAG AA verification
    - _Requirements: 9.6, 9.10, 11.2, 12.5_
  - [x] 7.2 Write property test for WCAG AA contrast
    - **Property 21: Tương phản văn bản đạt chuẩn WCAG AA**
    - File `lib/three/contrast.assetSuite.test.ts`; ≥4.5 normal / ≥3.0 large, symmetric, within [1, 21]
    - **Validates: Requirements 9.6, 9.10, 11.2, 12.5**
  - [x] 7.3 Write property test for contact schema validation
    - **Property 22: Kiểm tra hợp lệ Contact theo contactSchema**
    - File `lib/schemas/contact.schema.test.ts`; trimmed name 1–120, valid email, message 1–5000
    - **Validates: Requirements 10.5**
  - [x] 7.4 Write property test for DPR clamping (reuse `graphicsTier.clampDpr`)
    - **Property 24: Giới hạn DPR theo trần của tier**
    - File `lib/three/graphicsTier.clampDpr.assetSuite.test.ts` (tagged for this feature)
    - **Validates: Requirements 13.3**
  - [x] 7.5 Write property test for runtime tier downgrade (reuse `fpsMonitor` + `graphicsTier`)
    - **Property 25: Hạ tier runtime khi FPS sụt và dừng ở tier thấp nhất**
    - File `lib/three/fpsMonitor.downgrade.assetSuite.test.ts`; rising-edge `shouldDowngrade` once, `downgradeTier` adjacent step, stays at low
    - **Validates: Requirements 13.4, 13.5**

- [~] 8. Checkpoint - Ensure all pure-logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Extract shared safety frame `SceneCanvas`
  - [x] 9.1 Create `components/three/SceneCanvas.tsx`
    - Extract the safety frame from `HeroScene.tsx`: WebGL guard via `isWebGLAvailable` (`useSyncExternalStore`), `CanvasErrorBoundary`, `QualityProvider`, `clampDpr`/preset, `alpha:true` + `aria-hidden`; accept `children`, `fallback` (default `<HeroFallback/>`), `cameraConfig`, `fpsConfig` (default `{ windowMs:1000, minFps:40, sustainedMs:2000 }`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 13.3, 13.4_
  - [x] 9.2 Refactor `HeroScene.tsx` to consume `SceneCanvas`
    - Replace inlined safety frame with `SceneCanvas`; keep Hero behavior unchanged
    - _Requirements: 3.1, 3.9_
  - [~] 9.3 Write render and a11y tests for `SceneCanvas`
    - WebGL-unavailable → fallback within 1s; runtime error → fallback + page survives; aria-hidden + transparent canvas (vitest-axe)
    - File `components/three/SceneCanvas.test.tsx`
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 1.8, 12.1, 12.2_

- [ ] 10. Desktop_Model replaces TorusKnot in Hero
  - [~] 10.1 Create `components/three/hero/DesktopModel.tsx`
    - Load optimized GLB via `useGLTF` using `resolveModelPath("programmer-desktop")`; apply dark material with at least one Accent_Palette emissive
    - Center + fit using `computeNormalizationTransform`/`computeFitScale` (recompute on viewport change, debounced 500ms); reduce detail/shadows on tier `low`; clamp motion via Motion_Config when reduced
    - `<Suspense>` Loading_State covering Hero background; 10s timeout → `onError`; expose `onLoaded`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 2.5, 2.8_
  - [~] 10.2 Wire `DesktopModel` into `components/three/hero/Scene.tsx`
    - Replace `CentralObject` (TorusKnot); reuse existing Lighting and PostProcessing
    - _Requirements: 3.8, 3.9_
  - [~] 10.3 Write render and edge-case tests for `DesktopModel`
    - Focal/centered, emissive accent, low-tier preset, loading covers background, 10s timeout/load-fail → HeroFallback (keeps palette + interactive content)
    - File `components/three/hero/DesktopModel.test.tsx`
    - _Requirements: 4.1, 4.2, 4.5, 4.7, 4.8, 4.9_
  - [~] 10.4 Write a11y test for Hero scene with `DesktopModel`
    - Scene `aria-hidden="true"`, decorative, outside tab order (vitest-axe)
    - File `components/three/hero/DesktopModel.a11y.test.tsx`
    - _Requirements: 4.10, 12.1, 12.2_

- [ ] 11. Terminal_Screen on the desktop monitor
  - [~] 11.1 Create `components/three/hero/TerminalScreen.tsx`
    - Plane anchored to the monitor surface; black panel opacity 0.7–1.0 with cyan/green code text; blinking cursor via `cursorVisible` (period 0.5–1.0s) when not reduced, static when reduced; glow 4–16px via Bloom/emissive; tier `low` → static `textures/terminal-screen.png` with glow off; decorative, non-focusable
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  - [~] 11.2 Mount `TerminalScreen` from `DesktopModel` after load
    - Render on the monitor surface within 1s of model load via `onLoaded`; local error boundary → uniform black panel without breaking layout
    - _Requirements: 5.1, 5.8_
  - [~] 11.3 Write render and edge-case tests for `TerminalScreen`
    - Renders after load, opacity/colors, glow range, low-tier static texture, texture-fail → black panel, decorative no-focus (vitest-axe)
    - File `components/three/hero/TerminalScreen.test.tsx`
    - _Requirements: 5.1, 5.2, 5.4, 5.6, 5.7, 5.8_

- [ ] 12. Cube_Logo
  - [x] 12.1 Create `components/three/CubeLogo.tsx`
    - Code-built `boxGeometry` with glass/light-metal `meshPhysicalMaterial`; cyan→violet gradient; letter "T" on the camera-facing face via drei `<Text>`; rotate around vertical axis via `advanceRotation` (delta-time) at ≤0.1 rev/s so one revolution ≥10s; glow within config; stop when reduced; reduce glow on tier `low`; `role` prop ("hero-bg" | "loading" | "brand")
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - [~] 12.2 Write render tests for `CubeLogo`
    - Geometry/material, gradient, letter "T", glow limits, role variants, reduced-motion stops rotation, low-tier glow reduction
    - File `components/three/CubeLogo.test.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_

- [ ] 13. Tech_Icon_Orbit in Skills section
  - [~] 13.1 Create `components/three/skills/TechIconCard.tsx`
    - drei `<Billboard>` + SVG texture plane from `public/icons/`; hover shows skill label and boosts glow within 200ms, restores on leave; SVG load failure → fallback icon keeping position; decorative
    - _Requirements: 7.4, 7.7, 7.8, 7.11, 7.12_
  - [~] 13.2 Create `components/three/skills/TechIconOrbit.tsx`
    - Use `selectCardCount` (6–8, ≤6 on low) and `computeOrbitPosition` to lay out cards; apply Orbit_Motion_Config rotation + float; static when reduced
    - _Requirements: 7.2, 7.3, 7.5, 7.6, 7.9, 7.10, 7.13_
  - [~] 13.3 Integrate `TechIconOrbit` into `SkillsSection` via `SceneCanvas`
    - Feed `useSkills()` data; render section text before mounting the 3D scene
    - _Requirements: 7.1, 13.1_
  - [~] 13.4 Write render and edge-case tests for orbit
    - Hover label + glow timing, card count by tier, icons loaded from `public/icons/`, SVG-fail fallback keeps position
    - File `components/three/skills/TechIconOrbit.test.tsx`
    - _Requirements: 7.2, 7.7, 7.8, 7.10, 7.11, 7.12_
  - [~] 13.5 Write a11y test for Skills orbit scene
    - Decorative `aria-hidden`, outside tab order (vitest-axe)
    - File `components/three/skills/TechIconOrbit.a11y.test.tsx`
    - _Requirements: 12.1, 12.2_

- [~] 14. Checkpoint - Ensure Hero/Skills 3D and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Project_Carousel (DOM/CSS 3D) in Projects section
  - [~] 15.1 Create `components/sections/ProjectCarousel.tsx`
    - DOM/CSS 3D carousel (`perspective`, `transform-style: preserve-3d`) using `computeCardPlacement`/`navigate`/`wrapIndex`; center card 1.1–1.3× with side opacity 0.4–0.6; hover tilt ≤15° + border glow + image zoom ≤1.1× + cyan/violet shadow (100–300ms); next/prev 300–600ms; reduced-motion disables tilt/zoom (transition ≤100ms); responsive ≤768px (single center card, title ≥16px, touch targets ≥44×44); use `resolveProjectImage` for placeholders and link-visibility helper to hide null GitHub/Demo buttons; GitHub/Demo as focusable `<a>` with descriptive labels and visible focus
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.13_
  - [~] 15.2 Integrate `ProjectCarousel` into `ProjectsSection`
    - Feed `useProjects()`; render error message on load failure (layout intact); empty-state message when no projects
    - _Requirements: 8.1, 8.2, 8.11, 8.12_
  - [~] 15.3 Write render tests for `ProjectCarousel`
    - Field rendering, scale/opacity bands, hover tilt/zoom/timing, navigate timing, reduced-motion, responsive ≤768px
    - File `components/sections/ProjectCarousel.test.tsx`
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.9, 8.10_
  - [~] 15.4 Write edge-case and a11y tests for `ProjectCarousel`
    - Load error, empty state, missing-image placeholder, null link hidden; links focusable with non-empty accessible names (vitest-axe)
    - File `components/sections/ProjectCarousel.a11y.test.tsx`
    - _Requirements: 8.7, 8.8, 8.11, 8.12, 8.13, 12.3_

- [ ] 16. Experience_Timeline (DOM/CSS + scroll) in Experience section
  - [~] 16.1 Create `components/sections/ExperienceTimeline.tsx`
    - DOM/CSS circuit-style vertical line + glass cards; order via `sortExperiences`; highlight line proportional to `normalizeScrollProgress` (Lenis + IntersectionObserver); cards slide in at ≥30% visibility (300–600ms) using `slideDirection` (even=left, odd=right); circuit/grid background below cards without breaking contrast; `formatDateRange` ("Present"); reduced-motion → final state, line 100%
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
  - [~] 16.2 Integrate `ExperienceTimeline` into `ExperienceSection`
    - Feed `useExperiences()`; empty list → message, no line/cards rendered
    - _Requirements: 9.1, 9.2, 9.11_
  - [~] 16.3 Write render and edge-case tests for `ExperienceTimeline`
    - Line + per-card structure, reduced-motion final state (line 100%), "Present" label, empty-state message
    - File `components/sections/ExperienceTimeline.test.tsx`
    - _Requirements: 9.3, 9.8, 9.9, 9.11_
  - [~] 16.4 Write a11y and contrast tests for `ExperienceTimeline`
    - WCAG AA text contrast (normal 4.5:1 / large 3:1) with grid background; no axe violations (vitest-axe)
    - File `components/sections/ExperienceTimeline.a11y.test.tsx`
    - _Requirements: 9.6, 9.10, 12.5_

- [ ] 17. Contact_Terminal (HTML form) in Contact section
  - [~] 17.1 Create `components/sections/ContactTerminal.tsx`
    - HTML form with command-line prompts for name/email/message + blinking cursor (1s cycle) via `cursorVisible`; frosted glass card, monospace; focus glow applied only to the focused field; react-hook-form + `zodResolver(contactSchema)` (trimmed); invalid → block submit, per-field errors, keep input; reduced-motion → static cursor, no tilt
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.11, 10.13_
  - [~] 17.2 Integrate `ContactTerminal` into `ContactSection`
    - Valid submit calls `useSendContact`; pending → processing state + disabled submit (no duplicate sends); success → "Message sent successfully!"; failure → error message keeping input
    - _Requirements: 10.1, 10.7, 10.8, 10.9, 10.10_
  - [~] 17.3 Write behavior and edge-case tests for `ContactTerminal`
    - Invalid blocks + keeps data, valid calls mutation, pending disables submit, success line, failure keeps data
    - File `components/sections/ContactTerminal.test.tsx`
    - _Requirements: 10.6, 10.7, 10.8, 10.9, 10.10_
  - [~] 17.4 Write a11y test for `ContactTerminal`
    - Each field focusable with associated label/accessible name; keyboard-only completion and submit via user-event (vitest-axe)
    - File `components/sections/ContactTerminal.a11y.test.tsx`
    - _Requirements: 10.11, 10.12, 12.3_

- [ ] 18. Earth_Globe (optional) background for Contact/Footer
  - [~] 18.1 Create `components/three/earth/EarthGlobe.tsx`
    - Code-built `sphereGeometry` + `textures/earth.jpg`; rotate using `EARTH_ROTATION_DEG_PER_SEC` (0.5–2°/s), stop when reduced; subtle blue glow not breaking WCAG AA; ≤40% viewport, `pointer-events: none`, decorative `aria-hidden`; WebGL/texture failure → hidden, keep static background, no user-facing error
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7_
  - [~] 18.2 Integrate `EarthGlobe` behind feature flag in Contact/Footer via `SceneCanvas`
    - Enable via `isEarthEnabled(tier, NEXT_PUBLIC_ENABLE_EARTH)`; disabled on tier `low`
    - _Requirements: 11.3, 11.5_
  - [~] 18.3 Write render and edge-case tests for `EarthGlobe`
    - Size ≤40% + pointer-events none, reduced-motion static, decorative aria-hidden, WebGL/texture-fail hidden without error (vitest-axe)
    - File `components/three/earth/EarthGlobe.test.tsx`
    - _Requirements: 11.3, 11.4, 11.6, 11.7, 12.1_

- [ ] 19. Asset pipeline `scripts/optimize-assets.mjs`
  - [x] 19.1 Create `scripts/optimize-assets.mjs`
    - Run `npx gltf-transform optimize public/models/programmer_desktop_3d_pc.glb public/models/programmer-desktop.optimized.glb`; verify exit code and output existence; compare sizes (output ≤ source, warn if larger); apply bounding-box normalization (center→origin, maxDim→1.0) using transform from `lib/three/bbox.ts`; on failure keep source + clear error + non-zero exit
    - _Requirements: 2.1, 2.2, 2.4, 2.7_
  - [~] 19.2 Add npm script and document Public_Asset_Layout
    - Add `optimize:assets` script to `package.json`; document expected outputs (`models/programmer-desktop.optimized.glb`, optional `models/cube-logo.glb`, `models/earth.glb`; `textures/terminal-screen.png`, optional `textures/earth.jpg`, `textures/noise.png`; `icons/*.svg`) and `models/`/`textures/`/`icons/` layout
    - _Requirements: 2.3, 2.6_
  - [~] 19.3 Write integration test for the optimize script
    - Run script on source GLB → output exists and `size ≤ source` (2.1); simulate CLI failure (exit≠0/missing output) → keep source + clear error + non-zero exit (2.7)
    - File `scripts/optimize-assets.integration.test.mjs`
    - _Requirements: 2.1, 2.7_
  - [~] 19.4 Write smoke test for Public_Asset_Layout
    - Output path is `models/programmer-desktop.optimized.glb` (2.2); `models/`/`textures/`/`icons/` directory structure (2.3); expected output files exist per layout table (2.6)
    - File `scripts/optimize-assets.smoke.test.mjs`
    - _Requirements: 2.2, 2.3, 2.6_

- [~] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation and wiring sub-tasks are always implemented.
- Pure-logic modules in `lib/three/*` are implemented and property-tested before the R3F/DOM shells that consume them, so each shell builds on verified math.
- Each of the 25 correctness properties maps to exactly one property-based test (fast-check, ≥100 iterations) tagged `Feature: portfolio-3d-asset-suite, Property N: ...`.
- The suite reuses existing infrastructure (QualityProvider, FPS monitor, WebGL guard, CanvasErrorBoundary + HeroFallback, dynamic import, Lighting, PostProcessing, palette, data hooks, contactSchema) and never recreates it; the shared safety frame is extracted into `SceneCanvas`.
- Project_Carousel, Experience_Timeline, and Contact_Terminal are DOM/CSS 3D (not WebGL) to preserve keyboard focus and accessible names for interactive content.
- Every task references the specific requirements it implements for traceability; checkpoints provide incremental validation.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "2.1", "2.3", "3.1", "3.3", "4.1", "5.1", "6.1", "7.1", "9.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "1.6", "1.7", "2.2", "2.4", "3.2", "3.4", "4.2", "4.3", "4.4", "4.5", "5.2", "5.3", "5.4", "5.5", "6.2", "6.3", "6.4", "6.5", "7.2", "7.3", "7.4", "7.5", "9.2", "12.1", "19.1"] },
    { "id": 2, "tasks": ["9.3", "10.1", "12.2", "13.1", "15.1", "16.1", "17.1", "18.1", "19.2"] },
    { "id": 3, "tasks": ["10.2", "11.1", "13.2", "15.2", "16.2", "17.2", "19.3", "19.4"] },
    { "id": 4, "tasks": ["10.3", "10.4", "11.2", "13.3", "15.3", "15.4", "16.3", "16.4", "17.3", "17.4", "18.2"] },
    { "id": 5, "tasks": ["11.3", "13.4", "13.5", "18.3"] }
  ]
}
```
