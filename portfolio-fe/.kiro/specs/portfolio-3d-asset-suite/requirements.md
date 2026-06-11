# Requirements Document

## Introduction

Tài liệu này mô tả yêu cầu cho việc tạo và tích hợp một **bộ (suite) tài sản 3D** (3D assets) và hiệu ứng dùng chung phong cách (cohesive set) cho trang portfolio dành cho lập trình viên (frontend `portfolio-fe`, Next.js 16 + React 19 + React Three Fiber). Trọng tâm KHÔNG phải là dựng lại toàn bộ website mà là **sản xuất từng tài sản/hiệu ứng 3D riêng lẻ** và **tích hợp** chúng vào đúng khu vực (section) tương ứng.

Bộ tài sản gồm: mô hình bàn làm việc lập trình viên (Programmer Desktop) làm vật thể 3D chính của Hero, màn hình terminal phát sáng đặt trên màn hình bàn, khối lập phương logo (Cube Logo), các biểu tượng công nghệ (tech icons) bay quanh bàn theo quỹ đạo, băng chuyền thẻ dự án (Project Carousel) 3D, dòng thời gian kinh nghiệm (Experience Timeline) dạng mạch điện có hiệu ứng parallax theo cuộn trang, form liên hệ kiểu terminal, và một quả Địa Cầu (Earth) 3D **tùy chọn**.

Tất cả tài sản phải tuân thủ **một định hướng nghệ thuật thống nhất**: tông tối cao cấp (dark premium), góc nhìn bán-đẳng-cự (semi-isometric), phát sáng neon tinh tế (subtle neon glow), màu nền đen/navy, điểm nhấn phát sáng cyan + violet, vật liệu kính/kim loại nhẹ/nhựa mờ, chuyển động chậm và mượt.

Tính năng này **tái sử dụng** hạ tầng 3D đã được xây dựng và kiểm thử trong spec `hero-3d-visual-enhancement` (đã hoàn thành): `QualityProvider` cùng hệ thống tier (`high`/`medium`/`low`), bộ giám sát FPS và hạ tier thời gian chạy, xử lý `prefers-reduced-motion`, guard kiểm tra WebGL khả dụng, error boundary + `HeroFallback`, wrapper dynamic import (`ssr: false`), hệ thống ánh sáng, và pipeline hậu kỳ (Bloom/Vignette). Các tài sản 3D mới PHẢI tôn trọng các tier đồ họa, chế độ giảm chuyển động, hướng tiếp cận canvas trong suốt + `aria-hidden` cho cảnh trang trí, và cơ chế fallback đã thiết lập. Vật thể TorusKnot trung tâm trong Hero dự kiến được **thay thế** bằng mô hình Programmer Desktop.

Stack đã có sẵn: `@react-three/fiber` ^9, `@react-three/drei` ^10, `@react-three/postprocessing` 3.0.4, `three` ^0.184, `gsap` ^3.15, `framer-motion` ^12, `lenis` (smooth scroll), `next-intl` (i18n vi/en), `@tanstack/react-query`, `zustand`, Tailwind v4. Kiểm thử: `vitest` + `fast-check` + `@testing-library/react` + `@react-three/test-renderer` + `vitest-axe`, chạy bằng `npm run test` (vitest run, không watch). Property-based testing là chuẩn của nhóm cho logic thuần (toán quỹ đạo, chỉ số carousel, tiến độ timeline...).

## Glossary

- **Asset_Suite**: Toàn bộ tập hợp tài sản và hiệu ứng 3D được mô tả trong tài liệu này.
- **Art_Direction**: Bộ quy ước phong cách thị giác chung: tông tối cao cấp, bán-đẳng-cự, phát sáng neon tinh tế; nền đen/navy; điểm nhấn cyan + violet; vật liệu kính/kim loại nhẹ/nhựa mờ; chuyển động chậm mượt.
- **Accent_Palette**: Các mã màu điểm nhấn phát sáng — cyan (#22d3ee) và violet (#a855f7) — đồng bộ với `PALETTE` đã có trong `lib/three/palette.ts`.
- **Motion_Config**: Cấu hình tập trung định nghĩa các giới hạn chuyển động dùng chung của Asset_Suite (biên độ dịch chuyển, tốc độ quay, chu kỳ tối thiểu).
- **Orbit_Motion_Config**: Cấu hình tập trung định nghĩa chuyển động quỹ đạo và bay lên/xuống của Tech_Icon_Orbit (tốc độ xoay quỹ đạo, biên độ bay, chu kỳ).
- **Asset_Pipeline**: Quy trình chuẩn bị và tối ưu tài sản 3D (làm sạch, đổi màu, thêm phát sáng màn hình, đặt gốc/tỉ lệ, nén, xuất GLB) trước khi đưa vào ứng dụng.
- **Public_Asset_Layout**: Cấu trúc thư mục đầu ra dưới `public/` cho mô hình, texture và icon.
- **Loading_State**: Trạng thái tải/giữ chỗ hiển thị cho một Section trong khi tài sản 3D đang được nạp.
- **Desktop_Model**: Mô hình 3D bàn làm việc lập trình viên, nguồn từ `public/models/programmer_desktop_3d_pc.glb`, dùng làm vật thể 3D chính của Hero.
- **Terminal_Screen**: Hiệu ứng màn hình terminal/code phát sáng dựng bằng mã (R3F + drei `Text`) hoặc texture, đặt trên màn hình của Desktop_Model.
- **Cube_Logo**: Khối lập phương 3D dựng bằng mã, vật liệu kính/kim loại, gradient cyan–violet, mang chữ cái cá nhân ("T")/logo, xoay chậm và phát sáng.
- **Tech_Icon_Orbit**: Tập 6–8 biểu tượng công nghệ (SVG) đặt trên các mặt phẳng/thẻ 3D nhỏ bay quanh Desktop_Model theo vòng tròn, luôn hướng về camera (billboard).
- **Tech_Icon_Card**: Một thẻ 3D đơn lẻ trong Tech_Icon_Orbit, mang một biểu tượng công nghệ và tên kỹ năng tương ứng.
- **Project_Carousel**: Băng chuyền thẻ dự án 3D theo chiều ngang; thẻ trung tâm lớn hơn, thẻ hai bên mờ đi.
- **Project_Card**: Một thẻ trong Project_Carousel, hiển thị dữ liệu của một `Project`.
- **Experience_Timeline**: Dòng thời gian kinh nghiệm dọc, có đường sáng kiểu mạch điện, mỗi mốc là một thẻ kính, sáng dần theo cuộn trang.
- **Contact_Terminal**: Form liên hệ kiểu terminal với các prompt dạng dòng lệnh, con trỏ nhấp nháy và dòng thông báo thành công.
- **Earth_Globe**: (TÙY CHỌN) Quả cầu Địa Cầu 3D dựng bằng mã, xoay chậm, phát sáng xanh nhẹ, dùng làm nền phụ cho khu vực liên hệ/footer.
- **Quality_Manager**: Logic xác định và điều chỉnh Graphics_Tier (tái sử dụng từ `hero-3d-visual-enhancement`).
- **Graphics_Tier**: Một trong các mức chất lượng đồ họa rời rạc `high`/`medium`/`low` (tái sử dụng `lib/three/graphicsTier.ts`).
- **Reduced_Motion_Mode**: Trạng thái khi hệ điều hành/trình duyệt báo `prefers-reduced-motion: reduce`.
- **Render_Canvas**: Phần tử `<Canvas>` của React Three Fiber chứa các tài sản 3D.
- **Fallback_Visual**: Hình ảnh thay thế tĩnh (không dùng WebGL) khi WebGL không khả dụng hoặc tài sản không tải được (tái sử dụng `HeroFallback`).
- **WebGL_Guard**: Cơ chế kiểm tra WebGL khả dụng trước khi mount Render_Canvas (tái sử dụng `isWebGLAvailable`).
- **Project**: Kiểu dữ liệu dự án hiện có (`id`, `title`, `slug`, `description`, `thumbnail`, `images`, `techStack`, `githubUrl`, `demoUrl`, `featured`, `order`).
- **Experience**: Kiểu dữ liệu kinh nghiệm hiện có (`company`, `position`, `description`, `startDate`, `endDate`, `order`).
- **Contact_Mutation**: Luồng gửi liên hệ hiện có (`hooks/mutations/use-contact.ts`) dùng `contactSchema` (`lib/schemas/contact.schema.ts`).
- **Section**: Khu vực nội dung trên trang nơi một tài sản được tích hợp (Hero, Skills, Projects, Experience, Contact, Footer).
- **DPR**: Device Pixel Ratio — tỉ lệ điểm ảnh thiết bị dùng để giới hạn độ phân giải render.
- **FPS**: Frames Per Second — số khung hình render mỗi giây.

## Requirements

### Requirement 1: Tuân thủ định hướng nghệ thuật thống nhất

**User Story:** Là chủ sở hữu portfolio, tôi muốn mọi tài sản 3D dùng chung một phong cách thị giác, để toàn trang trông như một sản phẩm cao cấp, liền mạch.

#### Acceptance Criteria

1. THE Asset_Suite SHALL áp dụng cho mỗi vật thể 3D đúng một loại vật liệu thuộc nhóm: kính, kim loại nhẹ, hoặc nhựa mờ.
2. THE Asset_Suite SHALL dùng cyan (#22d3ee) và violet (#a855f7) thuộc Accent_Palette làm màu điểm nhấn phát sáng cho mọi tài sản.
3. THE Asset_Suite SHALL giữ nền của các tài sản ở đúng một trong hai tông: đen hoặc navy.
4. THE Asset_Suite SHALL giới hạn chuyển động của mọi tài sản theo Motion_Config: biên độ dịch chuyển ≤ 0.5 đơn vị thế giới và tốc độ quay ≤ 0.1 vòng mỗi giây.
5. THE Asset_Suite SHALL giữ mỗi chu kỳ chuyển động lặp lại kéo dài tối thiểu 4 giây theo Motion_Config.
6. WHEN một khung hình được render, THE Asset_Suite SHALL cập nhật chuyển động dựa trên delta time, sao cho kết quả chuyển động như nhau trong dải 30–120 FPS.
7. IF một giá trị trong Motion_Config vượt quá ngưỡng cho phép, THEN THE Asset_Suite SHALL kẹp (clamp) giá trị đó về ngưỡng gần nhất.
8. THE Asset_Suite SHALL render mọi tài sản 3D trên Render_Canvas có nền trong suốt (alpha).

### Requirement 2: Pipeline tối ưu tài sản và cấu trúc thư mục đầu ra

**User Story:** Là nhà phát triển, tôi muốn một quy trình chuẩn để tối ưu và sắp xếp tài sản 3D, để dung lượng tải nhỏ và đường dẫn tài sản nhất quán.

#### Acceptance Criteria

1. WHEN một mô hình GLB nguồn được chuẩn bị cho production, THE Asset_Pipeline SHALL tạo một biến thể đã tối ưu bằng `npx gltf-transform optimize <in.glb> <out.glb>` sao cho dung lượng tệp của biến thể đã tối ưu nhỏ hơn hoặc bằng dung lượng tệp nguồn.
2. THE Asset_Pipeline SHALL xuất biến thể đã tối ưu của Desktop_Model thành `public/models/programmer-desktop.optimized.glb`.
3. THE Public_Asset_Layout SHALL đặt các mô hình 3D dưới `public/models/`, các texture dưới `public/textures/`, và các biểu tượng công nghệ dưới `public/icons/`.
4. THE Asset_Pipeline SHALL đảm bảo biến thể đã tối ưu của Desktop_Model có tâm hộp bao (bounding box) nằm trong khoảng ±0.001 đơn vị thế giới so với gốc tọa độ, và có kích thước cạnh lớn nhất của hộp bao được chuẩn hóa về 1.0 với sai số ±0.001.
5. WHERE một mô hình GLB được dùng trong cảnh, THE Asset_Suite SHALL nạp biến thể đã tối ưu thay vì tệp nguồn chưa tối ưu.
6. THE Public_Asset_Layout SHALL ghi rõ trong tài liệu các tệp đầu ra dự kiến: `models/programmer-desktop.optimized.glb`, tùy chọn `models/cube-logo.glb`, tùy chọn `models/earth.glb`; `textures/terminal-screen.png`, tùy chọn `textures/earth.jpg`, `textures/noise.png`; và các tệp `icons/*.svg`.
7. IF lệnh `npx gltf-transform optimize` kết thúc với mã thoát khác 0 hoặc không tạo được tệp đầu ra, THEN THE Asset_Pipeline SHALL giữ nguyên tệp nguồn chưa tối ưu và phát ra thông báo lỗi cho biết quá trình tối ưu đã thất bại.
8. IF biến thể đã tối ưu của một mô hình GLB không tồn tại tại đường dẫn dự kiến, THEN THE Asset_Suite SHALL nạp tệp nguồn chưa tối ưu và ghi nhận cảnh báo cho biết biến thể đã tối ưu bị thiếu.

### Requirement 3: Tái sử dụng hạ tầng 3D hiện có

**User Story:** Là nhà phát triển, tôi muốn các tài sản mới dùng lại hạ tầng Hero đã kiểm thử, để không nhân đôi logic về chất lượng, fallback và an toàn SSR.

#### Acceptance Criteria

1. THE Asset_Suite SHALL đọc giá trị Graphics_Tier hiện tại từ Quality_Manager đã có thay vì tự định nghĩa hệ thống tier mới.
2. THE Asset_Suite SHALL nạp tất cả thành phần 3D qua dynamic import với cấu hình `ssr: false`.
3. THE Asset_Suite SHALL chỉ truy cập các API trình duyệt (window, document, WebGLRenderingContext) sau khi thành phần đã gắn vào DOM phía client.
4. IF việc khởi tạo ngữ cảnh WebGL trả về null hoặc ném lỗi khi gọi tạo context trên phần tử canvas, THEN THE Asset_Suite SHALL coi đó là trạng thái WebGL không khả dụng.
5. WHILE đang ở trạng thái WebGL không khả dụng, THE Asset_Suite SHALL hiển thị Fallback_Visual thay cho Render_Canvas của Section tương ứng trong vòng 1 giây kể từ khi xác định trạng thái.
6. IF việc render một tài sản 3D ném lỗi runtime, THEN THE Asset_Suite SHALL chuyển sang hiển thị Fallback_Visual cho Section đó.
7. IF việc render một tài sản 3D ném lỗi runtime, THEN THE Asset_Suite SHALL ghi lại lỗi và giữ cho phần còn lại của trang tiếp tục hiển thị mà không làm sập trang.
8. THE Desktop_Model SHALL thay thế vật thể TorusKnot trung tâm hiện tại trong Hero_Scene.
9. THE Desktop_Model SHALL dùng lại hệ thống ánh sáng và pipeline hậu kỳ đã có của Hero_Scene thay vì tạo cấu hình mới.

### Requirement 4: Mô hình Programmer Desktop trong Hero

**User Story:** Là khách truy cập, tôi muốn thấy một bàn làm việc lập trình viên 3D ấn tượng ở Hero, để biết ngay đây là portfolio của một lập trình viên.

#### Acceptance Criteria

1. THE Desktop_Model SHALL được render làm vật thể 3D trung tâm (focal) trong Hero Section.
2. THE Desktop_Model SHALL áp dụng vật liệu tông tối theo Art_Direction, với ít nhất một điểm nhấn phát sáng (emissive) sử dụng màu thuộc Accent_Palette.
3. WHEN Hero_Scene khởi tạo, THE Desktop_Model SHALL được căn giữa theo trục ngang và dọc, và được thu tỉ lệ sao cho toàn bộ hộp bao (bounding box) nằm trọn trong khung hình của Hero_Scene mà không bị cắt (clipping) ở bất kỳ cạnh nào.
4. WHILE kích thước viewport thay đổi, THE Desktop_Model SHALL được căn giữa và thu tỉ lệ lại trong vòng 500 mili-giây sau khi viewport ngừng thay đổi, sao cho toàn bộ hộp bao vẫn nằm trọn trong khung hình mà không bị cắt ở bất kỳ cạnh nào.
5. WHERE Graphics_Tier là `low`, THE Desktop_Model SHALL nạp hoặc hiển thị ở mức chi tiết và đổ bóng giảm theo preset đã định nghĩa cho tier `low`.
6. WHILE Reduced_Motion_Mode đang bật, THE Desktop_Model SHALL giữ trạng thái tĩnh hoặc chỉ chuyển động với biên độ không vượt quá biên độ giảm nhẹ đã định nghĩa trong Motion_Config.
7. WHILE biến thể đã tối ưu của Desktop_Model đang được nạp, THE Hero_Scene SHALL hiển thị Loading_State chiếm trọn vùng nền Hero.
8. IF biến thể đã tối ưu của Desktop_Model không tải xong trong vòng 10 giây hoặc tải thất bại, THEN THE Hero_Scene SHALL hiển thị Fallback_Visual và ghi lại lỗi.
9. WHEN Fallback_Visual được hiển thị thay cho Desktop_Model, THE Fallback_Visual SHALL giữ Accent_Palette, che phủ trọn vùng nền Hero, và giữ nguyên khả năng đọc và tương tác của toàn bộ nội dung văn bản và nút bấm trong Hero Section.
10. THE Desktop_Model SHALL được đánh dấu trang trí trong cây khả năng truy cập (cảnh chứa nó mang `aria-hidden="true"`).

### Requirement 5: Màn hình Terminal phát sáng

**User Story:** Là khách truy cập, tôi muốn màn hình của bàn làm việc hiển thị dòng code phát sáng, để cảnh sống động và đúng chủ đề lập trình.

#### Acceptance Criteria

1. WHEN Desktop_Model hoàn tất tải xong, THE Terminal_Screen SHALL được render trên bề mặt màn hình của Desktop_Model trong vòng 1 giây.
2. THE Terminal_Screen SHALL hiển thị một panel nền đen với độ mờ (opacity) trong khoảng 0.7 đến 1.0, và chữ code có màu cyan hoặc xanh lá.
3. WHILE Reduced_Motion_Mode đang tắt, THE Terminal_Screen SHALL hiển thị một con trỏ nhấp nháy với chu kỳ từ 0.5 đến 1.0 giây mỗi lần bật/tắt.
4. THE Terminal_Screen SHALL áp dụng hiệu ứng phát sáng (glow) bao quanh vùng màn hình với bán kính từ 4 đến 16 pixel.
5. WHILE Reduced_Motion_Mode đang bật, THE Terminal_Screen SHALL giữ con trỏ và nội dung ở trạng thái tĩnh, không nhấp nháy và không thay đổi sau khi render lần đầu.
6. WHERE Graphics_Tier là `low`, THE Terminal_Screen SHALL hiển thị bằng một texture tĩnh thay cho chữ động và tắt hiệu ứng phát sáng.
7. THE Terminal_Screen SHALL được đánh dấu là phần tử trang trí (decorative) trong cây khả năng truy cập và không nhận tiêu điểm bàn phím.
8. IF texture hoặc nội dung của Terminal_Screen không tải được, THEN THE Terminal_Screen SHALL hiển thị một panel nền đen đồng nhất không có chữ và giữ nguyên bố cục cảnh, không làm gián đoạn việc render Desktop_Model.

### Requirement 6: Cube Logo 3D

**User Story:** Là chủ sở hữu portfolio, tôi muốn một khối logo 3D mang chữ cái cá nhân, để tạo dấu ấn nhận diện thương hiệu.

#### Acceptance Criteria

1. THE Cube_Logo SHALL được dựng bằng mã từ hình hộp (box geometry) với vật liệu thuộc nhóm kính hoặc kim loại nhẹ thuộc Art_Direction.
2. THE Cube_Logo SHALL áp dụng gradient màu chuyển giữa cyan (#22d3ee) và violet (#a855f7) thuộc Accent_Palette trên bề mặt khối.
3. THE Cube_Logo SHALL hiển thị chữ cái cá nhân "T" (hoặc logo cá nhân) rõ ràng trên ít nhất một mặt của khối đang hướng về camera.
4. WHILE Reduced_Motion_Mode đang tắt, WHEN một khung hình được render, THE Cube_Logo SHALL xoay liên tục quanh trục đứng, cập nhật theo delta time (không phụ thuộc FPS), với tốc độ giới hạn theo Motion_Config sao cho một vòng quay hoàn chỉnh kéo dài tối thiểu 8 giây.
5. THE Cube_Logo SHALL áp dụng hiệu ứng phát sáng (glow) quanh khối với cường độ nằm trong giới hạn đã định nghĩa trong cấu hình.
6. THE Cube_Logo SHALL có thể được tích hợp ở một trong các vai trò: vật thể nền của Hero Section, chỉ báo trạng thái tải (loading), hoặc logo nhận diện.
7. WHILE Reduced_Motion_Mode đang bật, THE Cube_Logo SHALL dừng xoay và giữ trạng thái tĩnh.
8. WHERE Graphics_Tier là `low`, THE Cube_Logo SHALL tắt hoặc giảm hiệu ứng phát sáng theo preset của tier.

### Requirement 7: Tech Icons bay quanh bàn làm việc

**User Story:** Là khách truy cập, tôi muốn thấy các biểu tượng công nghệ bay quanh bàn làm việc, để nắm nhanh các kỹ năng chính của lập trình viên.

#### Acceptance Criteria

1. THE Tech_Icon_Orbit SHALL được tích hợp trong Skills Section.
2. THE Tech_Icon_Orbit SHALL hiển thị từ 6 đến 8 Tech_Icon_Card, mỗi thẻ mang một biểu tượng công nghệ dạng SVG.
3. THE Tech_Icon_Orbit SHALL bố trí các Tech_Icon_Card trên một vòng tròn quanh Desktop_Model với khoảng cách góc đều nhau bằng 360° chia cho số lượng thẻ.
4. THE Tech_Icon_Card SHALL luôn hướng mặt về phía camera (billboard) với độ lệch góc tối đa 1 độ.
5. THE Tech_Icon_Orbit SHALL làm các Tech_Icon_Card xoay quanh quỹ đạo và bay lên/xuống nhẹ theo Orbit_Motion_Config.
6. THE Orbit_Motion_Config SHALL định nghĩa tốc độ xoay quỹ đạo bằng 6 độ mỗi giây (một vòng 360° mỗi 60 giây) và biên độ bay lên/xuống bằng ±0.05 đơn vị thế giới quanh vị trí gốc của mỗi thẻ với chu kỳ 4 giây.
7. WHEN con trỏ di vào một Tech_Icon_Card, THE Tech_Icon_Card SHALL hiển thị tên kỹ năng tương ứng và tăng cường phát sáng trong vòng 200 mili-giây.
8. WHEN con trỏ rời khỏi một Tech_Icon_Card, THE Tech_Icon_Card SHALL ẩn tên kỹ năng và khôi phục mức phát sáng mặc định trong vòng 200 mili-giây.
9. WHILE Reduced_Motion_Mode đang bật, THE Tech_Icon_Orbit SHALL tắt cả chuyển động xoay quỹ đạo lẫn bay lên/xuống và giữ các Tech_Icon_Card ở vị trí tĩnh.
10. WHERE Graphics_Tier là `low`, THE Tech_Icon_Orbit SHALL hiển thị tối đa 6 Tech_Icon_Card.
11. IF biểu tượng SVG của một Tech_Icon_Card tải thất bại, THEN THE Tech_Icon_Card SHALL hiển thị một biểu tượng dự phòng, giữ nguyên vị trí quỹ đạo và không làm gián đoạn các thẻ khác.
12. THE Tech_Icon_Card SHALL tải biểu tượng SVG từ `public/icons/`.
13. THE Tech_Icon_Orbit SHALL tính vị trí quỹ đạo của mỗi Tech_Icon_Card bằng một hàm thuần, tất định (đầu vào gồm chỉ số thẻ, tổng số thẻ, bán kính, thời gian trôi qua) để kiểm thử bằng property-based testing.

### Requirement 8: Băng chuyền thẻ dự án 3D

**User Story:** Là khách truy cập, tôi muốn duyệt các dự án trong một băng chuyền 3D, để khám phá công việc của lập trình viên một cách hấp dẫn.

#### Acceptance Criteria

1. THE Project_Carousel SHALL được tích hợp trong Projects Section.
2. THE Project_Carousel SHALL render mỗi Project_Card từ dữ liệu kiểu Project, gồm `thumbnail`/`images`, `title`, `description`, `techStack`, và các liên kết `githubUrl`, `demoUrl`.
3. THE Project_Carousel SHALL hiển thị thẻ trung tâm với tỷ lệ phóng to từ 1.1 đến 1.3 lần so với thẻ hai bên, và đặt độ mờ (opacity) của các thẻ hai bên trong khoảng 0.4 đến 0.6.
4. WHEN con trỏ di vào một Project_Card, THE Project_Card SHALL nghiêng theo hướng con trỏ với góc nghiêng tối đa 15 độ, phát sáng viền, phóng to ảnh tối đa 1.1 lần và đổ bóng màu cyan/violet, hoàn tất trong vòng 100 đến 300 mili-giây.
5. WHEN người dùng điều hướng tới thẻ kế tiếp hoặc trước đó, THE Project_Carousel SHALL chuyển thẻ trung tâm tương ứng và hoàn tất chuyển động trong vòng 300 đến 600 mili-giây.
6. THE Project_Carousel SHALL tính chỉ số thẻ và ánh xạ vị trí bằng logic thuần, tất định để kiểm thử bằng property-based testing.
7. WHERE một Project có `githubUrl` hoặc `demoUrl` là `null`, THE Project_Card SHALL ẩn nút tương ứng.
8. THE Project_Card SHALL hiển thị các liên kết GitHub/Demo dưới dạng phần tử có thể nhận tiêu điểm bàn phím, có chỉ báo tiêu điểm hiển thị rõ ràng và nhãn văn bản mô tả đích đến của liên kết.
9. WHILE Reduced_Motion_Mode đang bật, THE Project_Carousel SHALL tắt hiệu ứng nghiêng và phóng ảnh, chỉ giữ chuyển đổi thẻ với thời lượng tối đa 100 mili-giây.
10. WHEN chiều rộng viewport nhỏ hơn hoặc bằng 768 pixel, THE Project_Carousel SHALL điều chỉnh bố cục để hiển thị một Project_Card trung tâm tại một thời điểm, giữ cỡ chữ tiêu đề tối thiểu 16 pixel và vùng chạm của mỗi nút tối thiểu 44x44 pixel.
11. IF việc tải dữ liệu Project thất bại, THEN THE Project_Carousel SHALL hiển thị thông báo lỗi cho biết không tải được dự án và giữ nguyên bố cục Projects Section mà không gây treo giao diện.
12. WHILE danh sách Project rỗng, THE Project_Carousel SHALL hiển thị thông báo trạng thái rỗng cho biết chưa có dự án nào để hiển thị.
13. WHERE một Project có cả `thumbnail` là `null` lẫn `images` rỗng, THE Project_Card SHALL hiển thị ảnh giữ chỗ (placeholder) thay cho ảnh dự án.

### Requirement 9: Dòng thời gian kinh nghiệm với parallax

**User Story:** Là khách truy cập, tôi muốn xem kinh nghiệm làm việc trên một dòng thời gian sống động theo cuộn trang, để hiểu hành trình nghề nghiệp của lập trình viên.

#### Acceptance Criteria

1. THE Experience_Timeline SHALL được tích hợp trong Experience Section.
2. THE Experience_Timeline SHALL render mỗi mốc từ dữ liệu kiểu Experience, gồm `company`, `position`, `description`, `startDate`, `endDate`, sắp xếp tăng dần theo `order`; khi hai mốc có cùng giá trị `order`, THE Experience_Timeline SHALL sắp xếp các mốc đó giảm dần theo `startDate`.
3. THE Experience_Timeline SHALL hiển thị một đường dọc kiểu mạch điện và render mỗi mốc dưới dạng một thẻ kính riêng biệt.
4. WHILE người dùng cuộn trang, THE Experience_Timeline SHALL tô sáng đường dọc theo tỷ lệ đúng bằng giá trị tiến độ cuộn đã chuẩn hóa trong khoảng [0, 1], trong đó 0 tương ứng 0% chiều dài đường và 1 tương ứng 100% chiều dài đường.
5. WHEN một mốc đạt mức hiển thị tối thiểu 30% diện tích thẻ trong vùng nhìn, THE Experience_Timeline SHALL cho thẻ tương ứng trượt vào với thời lượng từ 300ms đến 600ms, theo quy tắc tất định: mốc có chỉ số vị trí (tính từ 0) là chẵn trượt vào từ trái, mốc có chỉ số vị trí lẻ trượt vào từ phải.
6. THE Experience_Timeline SHALL hiển thị nền lưới/mạch điện phía sau nội dung, đặt ở lớp dưới các thẻ và không làm thay đổi tỷ lệ tương phản văn bản của thẻ xuống dưới ngưỡng WCAG AA.
7. THE Experience_Timeline SHALL tính tiến độ cuộn đã chuẩn hóa trong khoảng [0, 1] bằng logic thuần, tất định để kiểm thử bằng property-based testing.
8. WHILE Reduced_Motion_Mode đang bật, THE Experience_Timeline SHALL hiển thị mọi thẻ ở trạng thái cuối với đường tô sáng 100% và không phát hiệu ứng trượt hay sáng dần.
9. WHERE `endDate` của một Experience là `null`, THE Experience_Timeline SHALL hiển thị khoảng thời gian của mốc đó từ `startDate` đến nhãn thời điểm hiện tại "Present".
10. THE Experience_Timeline SHALL trình bày nội dung văn bản của mỗi thẻ với tỷ lệ tương phản tối thiểu 4.5:1 cho văn bản thường và 3:1 cho văn bản lớn, đạt chuẩn WCAG AA.
11. IF danh sách dữ liệu Experience rỗng, THEN THE Experience_Timeline SHALL hiển thị thông báo cho biết chưa có kinh nghiệm và không render đường dọc hay thẻ nào.

### Requirement 10: Form liên hệ kiểu Terminal

**User Story:** Là khách truy cập, tôi muốn gửi tin nhắn qua một form liên hệ kiểu terminal, để tương tác đúng chất lập trình viên mà vẫn dễ dùng.

#### Acceptance Criteria

1. THE Contact_Terminal SHALL được tích hợp trong Contact Section.
2. THE Contact_Terminal SHALL hiển thị các prompt kiểu dòng lệnh cho các trường tên, email và nội dung tin nhắn, kèm con trỏ nhấp nháy theo chu kỳ 1 giây (hiện 0,5 giây, ẩn 0,5 giây).
3. THE Contact_Terminal SHALL hiển thị dưới dạng thẻ kính nền mờ, dùng phông chữ monospace.
4. WHILE một trường nhập đang giữ tiêu điểm, THE Contact_Terminal SHALL áp dụng phát sáng tiêu điểm chỉ lên trường đang giữ tiêu điểm đó và không áp dụng lên các trường khác.
5. WHEN người dùng gửi form, THE Contact_Terminal SHALL kiểm tra hợp lệ dữ liệu nhập bằng `contactSchema` với dữ liệu đã được cắt khoảng trắng đầu/cuối, áp dụng các ràng buộc: tên dài 1–120 ký tự, email đúng định dạng email, nội dung dài 1–5000 ký tự.
6. IF việc kiểm tra hợp lệ bằng `contactSchema` thất bại ở một hoặc nhiều trường, THEN THE Contact_Terminal SHALL chặn việc gửi, hiển thị thông báo lỗi mô tả cho từng trường không hợp lệ và giữ lại toàn bộ dữ liệu người dùng đã nhập.
7. WHEN người dùng gửi form và toàn bộ trường vượt qua kiểm tra hợp lệ, THE Contact_Terminal SHALL gọi Contact_Mutation.
8. WHILE Contact_Mutation đang chờ phản hồi, THE Contact_Terminal SHALL hiển thị trạng thái đang xử lý và vô hiệu hóa nút gửi để ngăn gửi trùng lặp.
9. WHEN Contact_Mutation trả về thành công, THE Contact_Terminal SHALL hiển thị dòng "Message sent successfully!".
10. IF Contact_Mutation thất bại, THEN THE Contact_Terminal SHALL hiển thị một thông báo lỗi mô tả và giữ lại dữ liệu người dùng đã nhập.
11. THE Contact_Terminal SHALL cung cấp mỗi trường nhập dưới dạng phần tử form có thể nhận tiêu điểm bàn phím và có nhãn gắn đúng cho trình đọc màn hình.
12. THE Contact_Terminal SHALL cho phép hoàn tất và gửi form chỉ bằng bàn phím.
13. WHILE Reduced_Motion_Mode đang bật, THE Contact_Terminal SHALL giữ con trỏ tĩnh và tắt hiệu ứng nghiêng theo con trỏ.

### Requirement 11: Earth 3D (Tùy chọn)

**User Story:** Là chủ sở hữu portfolio, tôi muốn một quả Địa Cầu 3D nhỏ làm nền phụ cho khu vực liên hệ nếu còn thời gian, để tăng chiều sâu thị giác mà không làm nặng trang.

#### Acceptance Criteria

1. WHERE Earth_Globe được bật, THE Earth_Globe SHALL được dựng bằng mã từ hình cầu với texture Địa Cầu và xoay chậm liên tục với tốc độ trong khoảng 0.5 đến 2 độ mỗi giây.
2. WHERE Earth_Globe được bật, THE Earth_Globe SHALL áp dụng hiệu ứng phát sáng xanh nhẹ sao cho tỷ lệ tương phản của mọi nội dung văn bản phía trên hoặc liền kề không giảm xuống dưới ngưỡng WCAG AA (4.5:1 cho văn bản thường, 3:1 cho văn bản lớn).
3. WHERE Earth_Globe được bật, THE Earth_Globe SHALL được dùng làm nền phụ cho Contact Section hoặc Footer, chiếm tối đa 40% diện tích khung nhìn (viewport) và không nhận bất kỳ sự kiện con trỏ (pointer events) nào.
4. WHILE Reduced_Motion_Mode đang bật, THE Earth_Globe SHALL dừng xoay và giữ trạng thái tĩnh.
5. WHERE Graphics_Tier là `low`, THE Earth_Globe SHALL bị tắt để giảm tải.
6. THE Earth_Globe SHALL được đánh dấu trang trí trong cây khả năng truy cập.
7. IF WebGL không khả dụng hoặc texture Địa Cầu tải thất bại, THEN THE Earth_Globe SHALL được ẩn đi và giữ nguyên nền tĩnh hiện có mà không hiển thị lỗi cho người dùng.

### Requirement 12: Khả năng tiếp cận của bộ tài sản

**User Story:** Là người dùng có nhu cầu tiếp cận, tôi muốn các hiệu ứng 3D không cản trở việc đọc và thao tác, để tôi vẫn dùng trang một cách thoải mái.

#### Acceptance Criteria

1. THE Asset_Suite SHALL gắn thuộc tính `aria-hidden="true"` cho mọi cảnh 3D thuần trang trí (không chứa nội dung tương tác).
2. THE Asset_Suite SHALL đặt mọi cảnh 3D thuần trang trí ngoài thứ tự tiêu điểm bàn phím (không thể nhận tiêu điểm khi điều hướng bằng phím Tab hoặc Shift+Tab).
3. WHERE một tài sản chứa nội dung tương tác, THE Asset_Suite SHALL cung cấp nội dung đó dưới dạng phần tử HTML có thể nhận tiêu điểm bàn phím qua phím Tab và có tên truy cập (accessible name) không rỗng tương ứng với chức năng của phần tử.
4. WHEN trạng thái `prefers-reduced-motion` thay đổi trong lúc trang đang mở, THE Asset_Suite SHALL cập nhật Reduced_Motion_Mode cho mọi tài sản trong vòng 500 mili-giây mà không cần tải lại trang.
5. THE Asset_Suite SHALL giữ nội dung văn bản tương tác đạt tỷ lệ tương phản tối thiểu 4,5:1 đối với văn bản thường và 3:1 đối với văn bản lớn (cỡ chữ từ 18pt trở lên, hoặc từ 14pt in đậm trở lên) so với nền phía sau, theo chuẩn WCAG 2.1 mức AA.

### Requirement 13: Hiệu năng và đáp ứng đa thiết bị

**User Story:** Là khách truy cập trên thiết bị bất kỳ, tôi muốn các tài sản 3D tải nhanh và chạy mượt, để trang không giật hay chặn nội dung.

#### Acceptance Criteria

1. WHEN một Section chứa tài sản 3D bắt đầu được hiển thị, THE Asset_Suite SHALL hiển thị toàn bộ nội dung văn bản của Section đó trước khi bắt đầu nạp các thành phần 3D và mô hình, sao cho nội dung văn bản không bị chặn bởi tiến trình nạp 3D.
2. WHILE một tài sản 3D đang nạp, THE Asset_Suite SHALL hiển thị một Loading_State hoặc placeholder chiếm đúng kích thước khung của tài sản, sao cho điểm Cumulative Layout Shift của Section trong suốt quá trình nạp bằng 0.
3. THE Asset_Suite SHALL giới hạn DPR của mỗi Render_Canvas trong khoảng từ 1.0 đến trần DPR của Graphics_Tier hiện tại.
4. WHILE một tài sản 3D đang render, THE Quality_Manager SHALL giám sát FPS theo trung bình trượt và hạ Graphics_Tier xuống tier thấp hơn liền kề khi FPS trung bình dưới 40 FPS liên tục trong 2 giây.
5. IF Graphics_Tier hiện tại đã là tier thấp nhất khi FPS trung bình dưới 40 FPS liên tục trong 2 giây, THEN THE Quality_Manager SHALL giữ nguyên tier hiện tại mà không hạ thêm.
6. WHEN Graphics_Tier bị hạ, THE Asset_Suite SHALL áp dụng tham số của tier mới cho toàn bộ tài sản đang hoạt động trong vòng 1 giây mà không tải lại trang.
7. WHEN viewport thay đổi qua một điểm ngắt giữa desktop và di động, THE Asset_Suite SHALL điều chỉnh bố cục và tỉ lệ của tài sản để vừa khung hình tương ứng mà không gây tràn nội dung theo chiều ngang.
8. WHERE một tài sản nằm hoàn toàn ngoài vùng nhìn, THE Asset_Suite SHALL tạm dừng hoặc giảm vòng lặp render của tài sản đó xuống tối đa 1 FPS.
