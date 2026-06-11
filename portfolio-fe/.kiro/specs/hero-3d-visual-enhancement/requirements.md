# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu cho việc nâng cấp chất lượng hình ảnh (visual quality) của cảnh 3D trong khu vực Hero banner của trang portfolio. Mục tiêu là làm cho cảnh 3D trông cao cấp (premium), hiện đại và tinh tế hơn — cải thiện vật liệu (materials), ánh sáng (lighting), bố cục hình học (composition), hiệu ứng hậu kỳ (post-processing), chuyển động (animation) và khả năng tương tác chuột — đồng thời **bảo toàn** các ràng buộc hiện có về hiệu năng (performance), khả năng tiếp cận (accessibility / `prefers-reduced-motion`), và an toàn khi render phía server (SSR-safety).

Cảnh 3D hiện tại (`components/three/HeroScene.tsx`) sử dụng React Three Fiber + drei + three.js, gồm một TorusKnot trung tâm, các quả cầu (orbs) bay, các vòng (rings), trường hạt (particle field), nền sao (Stars), và một camera rig theo dõi chuột. Cảnh được nạp qua dynamic import với `ssr: false` và được đánh dấu `aria-hidden` vì mang tính trang trí.

Bản nâng cấp này tập trung vào **chất lượng thẩm mỹ** chứ không thay đổi nội dung văn bản hay cấu trúc layout của Hero section. Tất cả thay đổi phải scale theo năng lực thiết bị và xuống cấp duyên dáng (graceful degradation) trên thiết bị yếu hoặc khi WebGL không khả dụng.

## Glossary

- **Hero_Scene**: Thành phần cảnh 3D được render trong khu vực Hero banner (`components/three/HeroScene.tsx`), bao gồm hình học, vật liệu, ánh sáng, hạt và camera.
- **Render_Canvas**: Phần tử `<Canvas>` của React Three Fiber chứa toàn bộ Hero_Scene.
- **Post_Processing_Pipeline**: Chuỗi xử lý hậu kỳ áp dụng lên ảnh render (ví dụ bloom, vignette, color grading) trước khi hiển thị.
- **Quality_Manager**: Logic xác định mức chất lượng đồ họa (graphics tier) áp dụng cho Hero_Scene dựa trên năng lực thiết bị và tùy chọn người dùng.
- **Camera_Rig**: Logic điều khiển vị trí camera, bao gồm hiệu ứng parallax theo con trỏ chuột.
- **Pointer_Input**: Dữ liệu vị trí của con trỏ chuột hoặc điểm chạm dùng cho tương tác parallax.
- **Reduced_Motion_Mode**: Trạng thái khi hệ điều hành/trình duyệt báo `prefers-reduced-motion: reduce`.
- **Graphics_Tier**: Một trong các mức chất lượng rời rạc (ví dụ: `high`, `medium`, `low`) quyết định mật độ hạt, độ phân giải render và việc bật/tắt hiệu ứng.
- **DPR**: Device Pixel Ratio — tỉ lệ điểm ảnh thiết bị dùng để giới hạn độ phân giải render.
- **Fallback_Visual**: Hình ảnh thay thế tĩnh (không dùng WebGL) hiển thị khi WebGL không khả dụng hoặc khởi tạo thất bại.
- **Loading_State**: Trạng thái hiển thị trong khi Hero_Scene đang được nạp.
- **FPS**: Frames Per Second — số khung hình render mỗi giây.

## Requirements

### Requirement 1: Nâng cấp vật liệu và bề mặt (Materials)

**User Story:** Là một khách truy cập portfolio, tôi muốn các vật thể 3D trông cao cấp và có chiều sâu vật liệu, để cảnh Hero tạo ấn tượng chuyên nghiệp.

#### Acceptance Criteria

1. THE Hero_Scene SHALL render các vật thể trung tâm bằng vật liệu dựa trên mô hình PBR (physically based rendering) với các thuộc tính metalness và roughness được cấu hình rõ ràng.
2. WHERE một vật liệu có metalness lớn hơn 0.0, THE Hero_Scene SHALL áp dụng phản chiếu môi trường (environment reflection) lên vật liệu đó bằng một environment map.
3. THE Hero_Scene SHALL giữ bảng màu chủ đạo gồm cyan (#22d3ee), violet (#a855f7), blue (#3b82f6) và pink (#ec4899).
4. WHERE Graphics_Tier là `low`, THE Hero_Scene SHALL thay thế environment map độ phân giải cao bằng một phiên bản độ phân giải thấp hơn hoặc một màu môi trường đơn giản.

### Requirement 2: Hiệu ứng hậu kỳ (Post-processing)

**User Story:** Là một khách truy cập portfolio, tôi muốn ánh sáng neon phát sáng mềm mại và màu sắc được tinh chỉnh, để cảnh trông giống một sản phẩm cao cấp.

#### Acceptance Criteria

1. THE Post_Processing_Pipeline SHALL áp dụng hiệu ứng bloom làm các vùng phát sáng (emissive) tỏa quầng sáng.
2. THE Post_Processing_Pipeline SHALL áp dụng hiệu ứng vignette làm tối nhẹ các góc khung hình.
3. THE Quality_Manager SHALL cho phép bật hoặc tắt hiệu ứng bloom và hiệu ứng vignette độc lập với nhau.
4. WHERE Graphics_Tier là `low`, THE Quality_Manager SHALL tắt Post_Processing_Pipeline.
5. WHILE Reduced_Motion_Mode đang bật, THE Post_Processing_Pipeline SHALL giữ các tham số hiệu ứng ở trạng thái tĩnh không dao động theo thời gian.
6. WHERE bất kỳ hiệu ứng hậu kỳ nào được bật, THE Render_Canvas SHALL giữ nền trong suốt (alpha) để nội dung phía dưới không bị che.

### Requirement 3: Cải thiện ánh sáng (Lighting)

**User Story:** Là một khách truy cập portfolio, tôi muốn ánh sáng làm nổi bật hình khối và chiều sâu, để cảnh trông sống động và có không khí.

#### Acceptance Criteria

1. THE Hero_Scene SHALL chiếu sáng các vật thể bằng đồng thời một nguồn sáng định hướng (key light) và một nguồn sáng phụ (fill light) có màu thuộc bảng màu chủ đạo.
2. THE Hero_Scene SHALL sử dụng ánh sáng môi trường (ambient hoặc environment) để tránh các vùng tối hoàn toàn không có chi tiết.
3. IF một nguồn sáng khởi tạo thất bại trong lúc chạy, THEN THE Hero_Scene SHALL tiếp tục render với các nguồn sáng còn khả dụng và chấp nhận chất lượng ánh sáng giảm.
4. WHERE Graphics_Tier là `high`, THE Hero_Scene SHALL bật đổ bóng (shadows) cho nguồn sáng chính.
5. WHERE Graphics_Tier là `low`, THE Hero_Scene SHALL tắt đổ bóng.

### Requirement 4: Bố cục và hình học tinh tế (Composition)

**User Story:** Là một khách truy cập portfolio, tôi muốn bố cục các vật thể 3D cân đối và hài hòa, để mắt người xem được dẫn dắt tự nhiên mà không che khuất nội dung văn bản.

#### Acceptance Criteria

1. THE Hero_Scene SHALL bố trí vật thể trung tâm và các vật thể phụ sao cho không vật thể nào che phủ vùng văn bản chính của Hero section.
2. THE Hero_Scene SHALL phân bố các vật thể phụ trên nhiều độ sâu (trục Z) để tạo cảm giác chiều sâu không gian.
3. WHEN Hero_Scene khởi tạo lần đầu, THE Hero_Scene SHALL đặt vật thể trung tâm nằm trọn trong khung hình.
4. WHILE kích thước viewport thay đổi, THE Hero_Scene SHALL giữ vật thể trung tâm nằm trọn trong khung hình.
5. WHERE vật thể trung tâm không vừa khung hình ở kích thước hiện tại, THE Hero_Scene SHALL thu nhỏ tỉ lệ vật thể trung tâm để vật thể vừa khung hình.

### Requirement 5: Chuyển động mượt mà và tinh tế (Animation)

**User Story:** Là một khách truy cập portfolio, tôi muốn các chuyển động trôi chảy và êm dịu, để cảnh tạo cảm giác cao cấp thay vì rối mắt.

#### Acceptance Criteria

1. THE Hero_Scene SHALL áp dụng chuyển động trôi (floating) và xoay liên tục cho các vật thể với tốc độ dao động không vượt quá biên độ đã định nghĩa trong cấu hình.
2. WHEN một khung hình được render, THE Hero_Scene SHALL cập nhật chuyển động dựa trên thời gian trôi qua (delta time) thay vì số khung hình, để tốc độ chuyển động độc lập với FPS.
3. WHILE Reduced_Motion_Mode đang bật, THE Hero_Scene SHALL giữ các vật thể ở trạng thái tĩnh hoặc chuyển động tối thiểu không vượt quá biên độ giảm nhẹ đã định nghĩa.
4. WHILE Reduced_Motion_Mode đang bật, THE Hero_Scene SHALL không render nền sao động (animated Stars).

### Requirement 6: Tương tác parallax theo con trỏ (Mouse Interactivity)

**User Story:** Là một khách truy cập portfolio, tôi muốn cảnh phản hồi nhẹ nhàng theo chuyển động chuột, để trải nghiệm có cảm giác tương tác và sống động.

#### Acceptance Criteria

1. WHEN Pointer_Input thay đổi vị trí, THE Camera_Rig SHALL nội suy (lerp) vị trí camera về phía mục tiêu tương ứng để tạo hiệu ứng parallax có độ trễ mượt.
2. THE Camera_Rig SHALL giới hạn biên độ dịch chuyển camera trong khoảng đã định nghĩa để vật thể trung tâm luôn nằm trong khung hình.
3. WHILE Reduced_Motion_Mode đang bật, THE Camera_Rig SHALL giữ camera ở vị trí cố định và không phản hồi theo Pointer_Input.
4. WHERE thiết bị hỗ trợ điểm chạm (touch), THE Camera_Rig SHALL phản hồi theo điểm chạm tương tự như con trỏ chuột.

### Requirement 7: Mở rộng chất lượng theo thiết bị (Quality Scaling)

**User Story:** Là một khách truy cập trên thiết bị di động hoặc máy cấu hình thấp, tôi muốn cảnh 3D chạy trơn tru, để trang không bị giật hay nóng máy.

#### Acceptance Criteria

1. WHEN Hero_Scene khởi tạo, THE Quality_Manager SHALL chọn một Graphics_Tier dựa trên các tín hiệu năng lực thiết bị có sẵn (ví dụ kích thước màn hình, device pixel ratio, số lõi CPU logic).
2. IF bất kỳ tín hiệu năng lực thiết bị nào nằm dưới ngưỡng đã định nghĩa cho tier đó, THEN THE Quality_Manager SHALL chọn Graphics_Tier `low`.
3. WHERE Graphics_Tier là `low`, THE Hero_Scene SHALL giảm số lượng hạt của trường hạt xuống mức đã định nghĩa cho tier đó.
4. THE Render_Canvas SHALL giới hạn DPR ở giá trị tối đa được định nghĩa cho Graphics_Tier hiện tại.
5. WHERE Graphics_Tier là `high`, THE Render_Canvas SHALL bật khử răng cưa (antialiasing).
6. WHERE Graphics_Tier là `low`, THE Render_Canvas SHALL tắt khử răng cưa.

### Requirement 8: Giám sát hiệu năng thời gian chạy (Runtime Performance)

**User Story:** Là một khách truy cập portfolio, tôi muốn cảnh tự động giảm tải khi máy quá yếu, để khung hình không bị giật kéo dài.

#### Acceptance Criteria

1. WHILE Hero_Scene đang render, THE Quality_Manager SHALL theo dõi FPS trung bình trong một cửa sổ thời gian đã định nghĩa.
2. IF FPS trung bình thấp hơn ngưỡng tối thiểu đã định nghĩa trong khoảng thời gian liên tục đã định nghĩa, THEN THE Quality_Manager SHALL hạ Graphics_Tier xuống mức thấp hơn kế tiếp.
3. WHEN Graphics_Tier bị hạ, THE Hero_Scene SHALL áp dụng các tham số của tier mới mà không tải lại trang.
4. THE Quality_Manager SHALL không nâng Graphics_Tier lên cao hơn tier được chọn ban đầu trong cùng một phiên xem trang.

### Requirement 9: Khả năng tiếp cận (Accessibility)

**User Story:** Là một người dùng có nhu cầu tiếp cận, tôi muốn cảnh 3D không gây cản trở, để tôi vẫn sử dụng trang một cách thoải mái.

#### Acceptance Criteria

1. THE Render_Canvas SHALL được đánh dấu `aria-hidden="true"` vì cảnh mang tính trang trí.
2. WHEN trạng thái `prefers-reduced-motion` thay đổi trong lúc trang đang mở, THE Hero_Scene SHALL cập nhật Reduced_Motion_Mode tương ứng mà không cần tải lại trang.
3. THE Hero_Scene SHALL không là phần tử nhận tiêu điểm bàn phím (keyboard focus).
4. THE Hero_Scene SHALL giữ vùng nội dung văn bản của Hero section có độ tương phản đạt chuẩn WCAG AA so với phần nền phía sau.

### Requirement 10: An toàn khi render phía server (SSR-safety)

**User Story:** Là chủ sở hữu trang, tôi muốn cảnh 3D không gây lỗi render phía server, để trang luôn tải ổn định.

#### Acceptance Criteria

1. THE Hero_Scene SHALL được nạp qua dynamic import với cấu hình `ssr: false`.
2. THE Hero_Scene SHALL chỉ truy cập các API của trình duyệt (ví dụ `window`, `matchMedia`, `navigator`) sau khi thành phần đã được gắn vào DOM phía client.
3. THE Hero_Scene SHALL kiểm tra rõ ràng sự tồn tại của môi trường client (ví dụ `typeof window !== "undefined"`) trước mỗi lần truy cập API của trình duyệt.

### Requirement 11: Trải nghiệm tải (Loading Experience)

**User Story:** Là một khách truy cập portfolio, tôi muốn thấy một trạng thái tải tinh tế trong khi cảnh 3D đang nạp, để trang không bị nhảy layout đột ngột.

#### Acceptance Criteria

1. WHILE Hero_Scene đang được nạp, THE Loading_State SHALL hiển thị một chỉ báo tải chiếm trọn vùng nền Hero.
2. WHEN Hero_Scene hoàn tất nạp, THE Hero_Scene SHALL chuyển tiếp xuất hiện bằng hiệu ứng làm rõ dần (fade-in) trong khoảng thời gian đã định nghĩa.
3. WHILE Reduced_Motion_Mode đang bật, THE Hero_Scene SHALL hiển thị ngay mà không áp dụng hiệu ứng fade-in.

### Requirement 12: Xuống cấp duyên dáng khi WebGL không khả dụng (Graceful Fallback)

**User Story:** Là một khách truy cập trên thiết bị không hỗ trợ WebGL, tôi muốn vẫn thấy một nền Hero đẹp, để trải nghiệm không bị vỡ.

#### Acceptance Criteria

1. IF WebGL không khả dụng trên trình duyệt, THEN THE Hero_Scene SHALL hiển thị Fallback_Visual thay cho Render_Canvas.
2. IF việc khởi tạo bối cảnh WebGL thất bại trong lúc chạy, THEN THE Hero_Scene SHALL chuyển sang hiển thị Fallback_Visual và ghi lại lỗi.
3. WHEN Fallback_Visual được hiển thị, THE Fallback_Visual SHALL giữ bảng màu chủ đạo và che phủ trọn vùng nền Hero.
4. WHEN Fallback_Visual được hiển thị, THE Hero section SHALL giữ nguyên khả năng đọc và tương tác của toàn bộ nội dung văn bản và nút bấm.
