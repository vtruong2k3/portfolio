# Requirements Document

## Introduction

Tài liệu này mô tả các yêu cầu cho **dev-portfolio-3d**, một website portfolio lập trình viên cao cấp với trải nghiệm 3D tương tác. Hệ thống gồm một ứng dụng frontend (Next.js App Router + TypeScript + Tailwind + React Three Fiber) và một backend tối giản (NestJS + PostgreSQL + Prisma) phục vụ nội dung động (dự án, kỹ năng, kinh nghiệm, blog, biểu mẫu liên hệ, phân tích lượt xem nhẹ). Dự án được tổ chức theo monorepo pnpm workspace.

Phạm vi bao gồm: hỗ trợ đa ngôn ngữ (Việt/Anh), tải xuống CV/Resume (PDF), tối ưu SEO/metadata/Open Graph, tuân thủ khả năng tiếp cận WCAG AA, giao diện quản trị (admin dashboard) đầy đủ cho một tài khoản Admin, lưu trữ ảnh cục bộ ở giai đoạn đầu, gửi email liên hệ qua SMTP, và kiểm thử tự động.

Phong cách thị giác: tối cao cấp (dark premium), hiệu ứng kính (glassmorphism), neon tinh tế, và các yếu tố 3D tương tác. Bảng màu: nền `#050816`/`#080A12`, màu chính cyan/blue, màu nhấn violet/pink.

Tài liệu áp dụng cách tiếp cận MVP theo từng giai đoạn (phased) nhằm tránh việc dự án trở nên quá phức tạp ở giai đoạn sớm. Mỗi yêu cầu được gắn nhãn giai đoạn (P1–P6) để định hướng thứ tự triển khai. Các yêu cầu mô tả "cái gì" (what) hệ thống phải làm; chi tiết "làm thế nào" (how) sẽ được xử lý trong tài liệu thiết kế.

## Glossary

- **Web_App**: Ứng dụng frontend Next.js (App Router, TypeScript) trong `apps/web`, hiển thị portfolio cho người truy cập.
- **API_Server**: Ứng dụng backend NestJS trong `apps/api`, cung cấp REST API cho nội dung động và quản trị.
- **Database**: Cơ sở dữ liệu PostgreSQL được truy cập thông qua Prisma ORM.
- **Shared_Package**: Gói `packages/shared` chứa kiểu dữ liệu (types) và schema dùng chung giữa Web_App và API_Server.
- **Config_Package**: Gói `packages/config` chứa cấu hình dùng chung (ví dụ ESLint, TypeScript, Tailwind base).
- **Visitor**: Người dùng cuối truy cập công khai vào Web_App, không cần đăng nhập.
- **Admin**: Người dùng đã xác thực có quyền quản lý nội dung động qua Admin API.
- **Public_API**: Tập các endpoint REST không yêu cầu xác thực, phục vụ Visitor.
- **Admin_API**: Tập các endpoint REST yêu cầu xác thực JWT, phục vụ Admin.
- **Project**: Bản ghi dự án portfolio (title, slug, description, thumbnail, images[], techStack[], githubUrl, demoUrl, featured, order).
- **Skill**: Bản ghi kỹ năng (name, icon, category, level, order).
- **Experience**: Bản ghi kinh nghiệm/hành trình nghề nghiệp (company, position, description, startDate, endDate, order).
- **Blog_Post**: Bản ghi bài viết blog (title, slug, excerpt, content, coverImage, tags[], published, publishedAt).
- **Contact_Message**: Bản ghi tin nhắn liên hệ do Visitor gửi (name, email, message, isRead).
- **Site_Setting**: Bản ghi cấu hình website dạng khóa-giá trị (key, value).
- **Page_View**: Bản ghi sự kiện lượt xem trang phục vụ phân tích nhẹ (path, referrer, userAgent, createdAt).
- **Admin_Dashboard**: Giao diện quản trị trong Web_App cho phép Admin đăng nhập và quản lý nội dung động.
- **Locale**: Ngôn ngữ hiển thị của Web_App; hệ thống hỗ trợ tiếng Việt (`vi`) và tiếng Anh (`en`).
- **Hero_Scene**: Cảnh 3D ở khu vực Hero (logo/laptop 3D, chữ 3D, hiệu ứng).
- **Scroll_Controller**: Thành phần điều khiển cuộn mượt (Lenis) và các hiệu ứng kích hoạt theo cuộn (GSAP ScrollTrigger).
- **Cursor_Glow**: Hiệu ứng quầng sáng dạng radial bám theo con trỏ chuột, điều khiển qua CSS variables.
- **Contact_Form**: Biểu mẫu liên hệ trong Web_App cho phép Visitor gửi tin nhắn.
- **Throttler**: Cơ chế giới hạn tần suất yêu cầu (rate limiting) áp dụng cho endpoint gửi liên hệ.
- **Reduced_Motion**: Tùy chọn hệ thống của người dùng (`prefers-reduced-motion`) yêu cầu giảm thiểu chuyển động.
- **WCAG_AA**: Bộ tiêu chí Web Content Accessibility Guidelines mức AA mà Web_App hướng tới tuân thủ.

## Requirements

### Requirement 1: Khởi tạo cấu trúc monorepo và nền tảng dự án (P1)

**User Story:** Là một lập trình viên, tôi muốn một cấu trúc monorepo nhất quán, để tôi có thể phát triển frontend và backend cùng nhau với cấu hình dùng chung.

#### Acceptance Criteria

1. THE Web_App SHALL được đặt trong thư mục `apps/web` và sử dụng Next.js App Router với TypeScript.
2. THE API_Server SHALL được đặt trong thư mục `apps/api` và sử dụng NestJS với TypeScript.
3. THE Shared_Package SHALL được đặt trong thư mục `packages/shared` và export các kiểu dữ liệu dùng chung cho Web_App và API_Server.
4. THE Config_Package SHALL được đặt trong thư mục `packages/config` và export cấu hình dùng chung.
5. THE monorepo SHALL được quản lý bằng pnpm workspace với một tệp định nghĩa workspace ở thư mục gốc.
6. THE dự án SHALL cung cấp một tệp `docker-compose.yml` ở thư mục gốc khởi tạo dịch vụ PostgreSQL cho môi trường phát triển.
7. WHEN một lập trình viên chạy lệnh cài đặt phụ thuộc ở thư mục gốc, THE monorepo SHALL cài đặt phụ thuộc cho tất cả workspace trong một lần chạy.

### Requirement 2: Lược đồ dữ liệu và truy cập cơ sở dữ liệu (P1)

**User Story:** Là một lập trình viên backend, tôi muốn các mô hình dữ liệu được định nghĩa rõ ràng trong Prisma, để API có thể lưu trữ và truy xuất nội dung động một cách nhất quán.

#### Acceptance Criteria

1. THE Database SHALL định nghĩa mô hình Project với các trường: title, slug, description, thumbnail, images, techStack, githubUrl, demoUrl, featured, order.
2. THE Database SHALL định nghĩa mô hình Skill với các trường: name, icon, category, level, order.
3. THE Database SHALL định nghĩa mô hình Experience với các trường: company, position, description, startDate, endDate, order.
4. THE Database SHALL định nghĩa mô hình Contact_Message với các trường: name, email, message, isRead.
5. THE Database SHALL định nghĩa mô hình Site_Setting với các trường: key, value.
6. THE Database SHALL định nghĩa mô hình Admin với tối thiểu các trường: định danh người dùng và mật khẩu đã được băm (hashed).
7. THE Database SHALL định nghĩa mô hình Blog_Post với các trường: title, slug, excerpt, content, coverImage, tags, published, publishedAt.
8. THE Database SHALL định nghĩa mô hình Page_View với các trường: path, referrer, userAgent, createdAt.
9. THE slug của mỗi Project SHALL là duy nhất trong Database.
10. THE slug của mỗi Blog_Post SHALL là duy nhất trong Database.
11. THE key của mỗi Site_Setting SHALL là duy nhất trong Database.
12. WHEN một lập trình viên chạy lệnh migrate của Prisma, THE Database SHALL áp dụng lược đồ đã định nghĩa và tạo các bảng tương ứng.

### Requirement 3: API công khai cho nội dung dự án (P1)

**User Story:** Là một Visitor, tôi muốn xem các dự án qua API công khai, để Web_App có thể hiển thị danh mục dự án.

#### Acceptance Criteria

1. WHEN một yêu cầu GET tới `/projects` được nhận, THE Public_API SHALL trả về danh sách tất cả Project được sắp xếp theo trường order tăng dần.
2. WHEN một yêu cầu GET tới `/projects/featured` được nhận, THE Public_API SHALL trả về danh sách các Project có featured bằng true, sắp xếp theo trường order tăng dần.
3. WHEN một yêu cầu GET tới `/projects/:slug` với một slug tồn tại được nhận, THE Public_API SHALL trả về Project tương ứng với slug đó.
4. IF một yêu cầu GET tới `/projects/:slug` tham chiếu một slug không tồn tại, THEN THE Public_API SHALL trả về phản hồi lỗi với mã trạng thái HTTP 404.
5. THE Public_API SHALL trả về dữ liệu Project ở định dạng JSON.

### Requirement 4: API công khai cho kỹ năng và kinh nghiệm (P1)

**User Story:** Là một Visitor, tôi muốn xem kỹ năng và kinh nghiệm qua API công khai, để Web_App có thể hiển thị hồ sơ năng lực.

#### Acceptance Criteria

1. WHEN một yêu cầu GET tới `/skills` được nhận, THE Public_API SHALL trả về danh sách tất cả Skill được sắp xếp theo trường order tăng dần.
2. WHEN một yêu cầu GET tới `/experiences` được nhận, THE Public_API SHALL trả về danh sách tất cả Experience được sắp xếp theo trường order tăng dần.
3. THE Public_API SHALL trả về dữ liệu Skill và Experience ở định dạng JSON.

### Requirement 5: Giao diện hồ sơ tĩnh và bố cục (P2)

**User Story:** Là một Visitor, tôi muốn xem một trang portfolio có bố cục rõ ràng theo từng phần, để tôi có thể tìm hiểu về lập trình viên.

#### Acceptance Criteria

1. THE Web_App SHALL hiển thị một thanh điều hướng (navbar) chứa liên kết tới các phần: Hero, About Me, Skills, Projects, Experience, và Contact.
2. WHEN một Visitor chọn một liên kết điều hướng, THE Web_App SHALL cuộn tới phần tương ứng trên trang.
3. THE Web_App SHALL hiển thị các phần: Hero, About Me, Skills, Projects, Experience, và Contact theo thứ tự đã nêu.
4. THE Web_App SHALL áp dụng giao diện tối (dark mode) với màu nền `#050816` hoặc `#080A12`, màu chính cyan/blue, và màu nhấn violet/pink.
5. THE phần About Me SHALL hiển thị một thẻ kính (glass card) và một dòng thời gian (timeline).
6. WHILE giai đoạn P2 đang được triển khai, THE Web_App SHALL hiển thị nội dung từ dữ liệu mẫu (mock data) cho các phần Skills, Projects, và Experience.

### Requirement 6: Thiết kế đáp ứng (Responsive) (P2)

**User Story:** Là một Visitor sử dụng thiết bị di động hoặc máy tính, tôi muốn giao diện hiển thị phù hợp với kích thước màn hình, để tôi có trải nghiệm tốt trên mọi thiết bị.

#### Acceptance Criteria

1. WHILE chiều rộng khung nhìn (viewport) nhỏ hơn 768 pixel, THE Web_App SHALL hiển thị bố cục dành cho di động với điều hướng phù hợp cho màn hình hẹp.
2. WHILE chiều rộng khung nhìn từ 768 pixel trở lên, THE Web_App SHALL hiển thị bố cục dành cho màn hình rộng.
3. THE Web_App SHALL hiển thị tất cả các phần nội dung mà không gây tràn ngang (horizontal overflow) ở các điểm ngắt (breakpoint) đã hỗ trợ.

### Requirement 7: Hiệu ứng quầng sáng con trỏ và tương tác thẻ (P3)

**User Story:** Là một Visitor, tôi muốn các hiệu ứng tương tác tinh tế khi di chuyển chuột, để trải nghiệm cảm thấy cao cấp và sống động.

#### Acceptance Criteria

1. WHILE con trỏ chuột di chuyển bên trong khung nhìn của Web_App trên thiết bị có con trỏ, THE Cursor_Glow SHALL cập nhật vị trí quầng sáng radial theo tọa độ con trỏ thông qua CSS variables.
2. WHEN con trỏ chuột di chuyển vào vùng một thẻ tương tác, THE Web_App SHALL hiển thị hiệu ứng quầng sáng radial trên thẻ đó.
3. WHEN con trỏ chuột rời khỏi vùng một thẻ tương tác, THE Web_App SHALL ẩn hiệu ứng quầng sáng radial trên thẻ đó.
4. WHEN con trỏ chuột di chuyển vào vùng một nút có hiệu ứng từ tính (magnetic button), THE Web_App SHALL dịch chuyển nút theo hướng con trỏ trong giới hạn đã định.

### Requirement 8: Cuộn mượt và hoạt ảnh kích hoạt theo cuộn (P3)

**User Story:** Là một Visitor, tôi muốn cuộn trang mượt mà với hoạt ảnh xuất hiện theo cuộn, để nội dung được trình bày một cách cuốn hút.

#### Acceptance Criteria

1. WHILE Visitor cuộn trang trên thiết bị hỗ trợ con trỏ, THE Scroll_Controller SHALL áp dụng cuộn mượt (smooth scroll) cho Web_App.
2. WHEN một phần nội dung đi vào khung nhìn trong lúc cuộn, THE Scroll_Controller SHALL kích hoạt hoạt ảnh xuất hiện (reveal) cho phần đó.
3. WHEN Visitor điều hướng giữa các trang hoặc trạng thái hiển thị, THE Web_App SHALL áp dụng hiệu ứng chuyển trang gồm mờ dần (fade), làm nhòe (blur), và dịch chuyển theo trục y.
4. WHERE người dùng đã bật Reduced_Motion, THE Web_App SHALL vô hiệu hóa hoặc giảm thiểu các hoạt ảnh chuyển động không thiết yếu.

### Requirement 9: Cảnh 3D Hero và các yếu tố 3D (P4)

**User Story:** Là một Visitor, tôi muốn một cảnh 3D ấn tượng ở khu vực Hero, để portfolio tạo ấn tượng mạnh ngay từ đầu.

#### Acceptance Criteria

1. THE Web_App SHALL hiển thị Hero_Scene chứa một mô hình 3D (logo hoặc laptop), chữ 3D, và các nút kêu gọi hành động (CTA).
2. THE Hero_Scene SHALL được nạp bằng dynamic import với chế độ render phía máy chủ tắt (ssr false).
3. THE Web_App SHALL hiển thị một hiệu ứng hạt (particles) trong nền của khu vực 3D.
4. THE phần Skills SHALL hiển thị các biểu tượng kỹ năng theo bố cục 3D (quỹ đạo quanh một hình cầu hoặc thẻ nghiêng tilt).
5. THE phần Projects SHALL hiển thị các dự án dưới dạng cuộn ngang (horizontal scroll) hoặc băng chuyền 3D (3D carousel).
6. WHILE chiều rộng khung nhìn nhỏ hơn 768 pixel, THE Web_App SHALL giảm số lượng hạt được hiển thị so với màn hình rộng.
7. THE Web_App SHALL nạp các mô hình 3D ở định dạng glTF đã được nén.

### Requirement 10: Hiển thị dự án từ API (P4)

**User Story:** Là một Visitor, tôi muốn xem các dự án thực tế với thông tin chi tiết, để tôi có thể đánh giá năng lực của lập trình viên.

#### Acceptance Criteria

1. WHEN phần Projects được hiển thị, THE Web_App SHALL lấy dữ liệu Project từ Public_API.
2. THE Web_App SHALL hiển thị cho mỗi Project: hình ảnh, danh sách công nghệ (techStack), mô tả, liên kết GitHub, và liên kết demo.
3. WHEN con trỏ chuột di chuyển vào một thẻ Project, THE Web_App SHALL hiển thị hiệu ứng quầng sáng (hover glow) trên thẻ đó.
4. IF việc lấy dữ liệu Project từ Public_API thất bại, THEN THE Web_App SHALL hiển thị một thông báo trạng thái lỗi cho Visitor.
5. WHEN Visitor chọn liên kết GitHub hoặc liên kết demo của một Project, THE Web_App SHALL mở liên kết tương ứng trong một thẻ trình duyệt mới.

### Requirement 11: Hiển thị kinh nghiệm theo dòng thời gian (P4)

**User Story:** Là một Visitor, tôi muốn xem hành trình nghề nghiệp theo dòng thời gian dọc, để tôi hiểu được quá trình phát triển của lập trình viên.

#### Acceptance Criteria

1. WHEN phần Experience được hiển thị, THE Web_App SHALL lấy dữ liệu Experience từ Public_API.
2. THE Web_App SHALL hiển thị các Experience theo dạng dòng thời gian dọc (vertical timeline) sắp xếp theo trường order.
3. WHEN một mục Experience đi vào khung nhìn trong lúc cuộn, THE Scroll_Controller SHALL kích hoạt hoạt ảnh xuất hiện cho mục đó.

### Requirement 12: Biểu mẫu liên hệ và gửi tin nhắn (P3/P5)

**User Story:** Là một Visitor, tôi muốn gửi tin nhắn liên hệ, để tôi có thể kết nối với lập trình viên.

#### Acceptance Criteria

1. THE Web_App SHALL hiển thị Contact_Form gồm các trường: tên, email, và nội dung tin nhắn.
2. THE Web_App SHALL hiển thị các liên kết mạng xã hội trong phần Contact.
3. WHEN Visitor gửi Contact_Form với dữ liệu hợp lệ, THE Web_App SHALL gửi một yêu cầu POST tới `/contact` của Public_API.
4. IF Visitor gửi Contact_Form với trường email có định dạng không hợp lệ, THEN THE Web_App SHALL hiển thị thông báo xác thực và không gửi yêu cầu.
5. IF Visitor gửi Contact_Form với bất kỳ trường bắt buộc nào để trống, THEN THE Web_App SHALL hiển thị thông báo xác thực và không gửi yêu cầu.
6. WHEN một yêu cầu POST tới `/contact` với dữ liệu hợp lệ được nhận, THE API_Server SHALL lưu một bản ghi Contact_Message vào Database với isRead bằng false.
7. WHEN một bản ghi Contact_Message được lưu thành công, THE API_Server SHALL gửi một email thông báo qua SMTP tới địa chỉ email nhận được cấu hình qua biến môi trường.
8. IF một yêu cầu POST tới `/contact` chứa dữ liệu không hợp lệ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 400.
9. WHEN một yêu cầu POST tới `/contact` được xử lý thành công, THE Web_App SHALL hiển thị một thông báo xác nhận gửi thành công cho Visitor.

### Requirement 13: Giới hạn tần suất biểu mẫu liên hệ (P5)

**User Story:** Là chủ sở hữu website, tôi muốn giới hạn tần suất gửi biểu mẫu liên hệ, để hệ thống được bảo vệ khỏi việc gửi spam.

#### Acceptance Criteria

1. WHILE Throttler đang hoạt động trên endpoint `/contact`, THE API_Server SHALL giới hạn số lượng yêu cầu POST từ một địa chỉ IP trong một khoảng thời gian đã định.
2. IF số lượng yêu cầu POST tới `/contact` từ một địa chỉ IP vượt quá giới hạn đã định trong khoảng thời gian, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 429.

### Requirement 14: Xác thực Admin (P5)

**User Story:** Là một Admin, tôi muốn đăng nhập an toàn, để tôi có thể truy cập các chức năng quản trị nội dung.

#### Acceptance Criteria

1. WHEN một yêu cầu POST tới `/admin/login` với thông tin đăng nhập hợp lệ được nhận, THE API_Server SHALL trả về một token JWT.
2. IF một yêu cầu POST tới `/admin/login` chứa thông tin đăng nhập không hợp lệ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 401.
3. THE API_Server SHALL lưu trữ mật khẩu Admin ở dạng đã băm bằng bcrypt.
4. THE hệ thống SHALL hỗ trợ duy nhất một tài khoản Admin.
5. WHEN một yêu cầu tới Admin_API kèm theo token JWT hợp lệ được nhận, THE API_Server SHALL cho phép truy cập tới tài nguyên được yêu cầu.
6. IF một yêu cầu tới Admin_API thiếu token JWT hợp lệ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 401.

### Requirement 15: Quản trị nội dung dự án (CRUD) (P5)

**User Story:** Là một Admin đã xác thực, tôi muốn quản lý các dự án, để nội dung portfolio luôn được cập nhật.

#### Acceptance Criteria

1. WHEN một Admin đã xác thực gửi yêu cầu tạo Project hợp lệ tới Admin_API, THE API_Server SHALL lưu Project mới vào Database.
2. WHEN một Admin đã xác thực gửi yêu cầu cập nhật một Project tồn tại tới Admin_API, THE API_Server SHALL cập nhật bản ghi Project tương ứng trong Database.
3. WHEN một Admin đã xác thực gửi yêu cầu xóa một Project tồn tại tới Admin_API, THE API_Server SHALL xóa bản ghi Project tương ứng khỏi Database.
4. WHEN một Admin đã xác thực gửi yêu cầu đọc danh sách Project tới Admin_API, THE API_Server SHALL trả về danh sách tất cả Project.
5. IF một Admin đã xác thực gửi yêu cầu cập nhật hoặc xóa một Project không tồn tại, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 404.
6. IF một Admin gửi yêu cầu tạo hoặc cập nhật Project với dữ liệu không hợp lệ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 400.

### Requirement 16: Quản lý tin nhắn liên hệ và tải ảnh (P5)

**User Story:** Là một Admin đã xác thực, tôi muốn xem các tin nhắn liên hệ và tải ảnh dự án, để tôi có thể phản hồi liên hệ và quản lý hình ảnh.

#### Acceptance Criteria

1. WHEN một Admin đã xác thực gửi yêu cầu đọc danh sách Contact_Message tới Admin_API, THE API_Server SHALL trả về danh sách tất cả Contact_Message.
2. WHEN một Admin đã xác thực đánh dấu một Contact_Message là đã đọc, THE API_Server SHALL cập nhật isRead của bản ghi tương ứng thành true.
3. WHEN một Admin đã xác thực tải lên một tệp ảnh hợp lệ qua Admin_API, THE API_Server SHALL lưu trữ ảnh vào hệ thống lưu trữ cục bộ (local) của máy chủ và trả về một URL có thể truy cập của ảnh.
4. IF một Admin tải lên một tệp có định dạng không được hỗ trợ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 400.

### Requirement 17: Tài liệu API (P5)

**User Story:** Là một lập trình viên, tôi muốn tài liệu API tương tác, để tôi có thể hiểu và thử nghiệm các endpoint.

#### Acceptance Criteria

1. THE API_Server SHALL cung cấp tài liệu Swagger mô tả các endpoint của Public_API và Admin_API.
2. WHEN một lập trình viên truy cập đường dẫn tài liệu Swagger, THE API_Server SHALL hiển thị giao diện tài liệu API tương tác.

### Requirement 18: Triển khai (Deployment) (P6)

**User Story:** Là chủ sở hữu website, tôi muốn triển khai hệ thống lên môi trường lưu trữ, để portfolio có thể truy cập công khai.

#### Acceptance Criteria

1. THE Web_App SHALL có cấu hình triển khai tương thích với nền tảng lưu trữ frontend (ví dụ Vercel).
2. THE API_Server SHALL có cấu hình triển khai tương thích với nền tảng lưu trữ backend (ví dụ Render).
3. THE Database SHALL có cấu hình kết nối tương thích với nhà cung cấp PostgreSQL được lưu trữ (ví dụ Supabase).
4. THE hệ thống lưu trữ ảnh SHALL có cấu hình tương thích với nhà cung cấp lưu trữ ảnh được lưu trữ (ví dụ Cloudinary).
5. THE Web_App và API_Server SHALL đọc các giá trị cấu hình môi trường (ví dụ URL API, chuỗi kết nối Database) từ biến môi trường thay vì giá trị cố định trong mã nguồn.

### Requirement 19: Đa ngôn ngữ (i18n Việt/Anh) (P2)

**User Story:** Là một Visitor, tôi muốn xem website bằng tiếng Việt hoặc tiếng Anh, để tôi đọc nội dung bằng ngôn ngữ mình quen thuộc.

#### Acceptance Criteria

1. THE Web_App SHALL hỗ trợ hai Locale: tiếng Việt (`vi`) và tiếng Anh (`en`).
2. THE Web_App SHALL hiển thị một bộ chuyển đổi ngôn ngữ (language switcher) cho phép Visitor thay đổi Locale.
3. WHEN một Visitor thay đổi Locale, THE Web_App SHALL hiển thị nội dung giao diện tĩnh theo Locale được chọn.
4. THE Web_App SHALL ghi nhớ Locale mà Visitor đã chọn cho các lần truy cập tiếp theo trong cùng trình duyệt.
5. WHERE một Visitor truy cập lần đầu mà chưa chọn Locale, THE Web_App SHALL chọn Locale mặc định dựa trên thiết lập ngôn ngữ của trình duyệt, và quay về một Locale mặc định nếu không xác định được.

### Requirement 20: Nội dung Blog (P2 hiển thị / P5 quản trị)

**User Story:** Là một Visitor, tôi muốn đọc các bài viết blog, để tôi tìm hiểu thêm về kiến thức và góc nhìn của lập trình viên.

#### Acceptance Criteria

1. WHEN một yêu cầu GET tới `/posts` được nhận, THE Public_API SHALL trả về danh sách các Blog_Post có published bằng true, sắp xếp theo publishedAt giảm dần.
2. WHEN một yêu cầu GET tới `/posts/:slug` với một slug đã xuất bản tồn tại được nhận, THE Public_API SHALL trả về Blog_Post tương ứng.
3. IF một yêu cầu GET tới `/posts/:slug` tham chiếu một slug không tồn tại hoặc chưa xuất bản, THEN THE Public_API SHALL trả về phản hồi lỗi với mã trạng thái HTTP 404.
4. THE Web_App SHALL hiển thị một trang danh sách blog và một trang chi tiết bài viết.
5. WHEN một Admin đã xác thực gửi yêu cầu tạo, cập nhật, hoặc xóa một Blog_Post tới Admin_API, THE API_Server SHALL thực hiện thao tác tương ứng trên Database.
6. IF một Admin gửi yêu cầu tạo hoặc cập nhật Blog_Post với dữ liệu không hợp lệ, THEN THE API_Server SHALL trả về phản hồi lỗi với mã trạng thái HTTP 400.

### Requirement 21: Tải xuống CV/Resume (P2)

**User Story:** Là một Visitor (ví dụ nhà tuyển dụng), tôi muốn tải CV của lập trình viên dưới dạng PDF, để tôi có thể lưu lại và xem ngoại tuyến.

#### Acceptance Criteria

1. THE Web_App SHALL hiển thị một nút hoặc liên kết tải xuống CV/Resume.
2. WHEN một Visitor chọn nút tải xuống CV, THE Web_App SHALL cung cấp tệp CV ở định dạng PDF.
3. THE đường dẫn tới tệp CV SHALL được cấu hình qua Site_Setting hoặc biến môi trường thay vì cố định trong mã nguồn.

### Requirement 22: Phân tích lượt xem nhẹ (P5)

**User Story:** Là chủ sở hữu website, tôi muốn theo dõi lượt xem trang một cách nhẹ nhàng, để tôi biết mức độ quan tâm tới portfolio.

#### Acceptance Criteria

1. WHEN một Visitor xem một trang của Web_App, THE Web_App SHALL gửi một yêu cầu ghi nhận lượt xem tới API_Server.
2. WHEN một yêu cầu ghi nhận lượt xem được nhận, THE API_Server SHALL lưu một bản ghi Page_View vào Database.
3. THE API_Server SHALL không lưu trữ thông tin định danh cá nhân (PII) trong bản ghi Page_View.
4. WHEN một Admin đã xác thực yêu cầu dữ liệu thống kê lượt xem tới Admin_API, THE API_Server SHALL trả về số liệu tổng hợp lượt xem.

### Requirement 23: Giao diện quản trị (Admin Dashboard) (P5)

**User Story:** Là một Admin, tôi muốn một giao diện quản trị trực quan, để tôi quản lý nội dung mà không cần gọi API thủ công.

#### Acceptance Criteria

1. THE Web_App SHALL cung cấp Admin_Dashboard với một trang đăng nhập.
2. WHEN Admin gửi thông tin đăng nhập hợp lệ qua Admin_Dashboard, THE Web_App SHALL lưu token JWT và cho phép truy cập các trang quản trị.
3. WHILE Admin chưa được xác thực, THE Web_App SHALL chuyển hướng các yêu cầu truy cập trang quản trị về trang đăng nhập.
4. THE Admin_Dashboard SHALL cung cấp giao diện quản lý (tạo, đọc, cập nhật, xóa) cho Project, Skill, Experience, và Blog_Post.
5. THE Admin_Dashboard SHALL cung cấp giao diện xem danh sách Contact_Message và đánh dấu một tin nhắn là đã đọc.
6. THE Admin_Dashboard SHALL cung cấp giao diện tải lên ảnh dự án.
7. WHEN Admin chọn đăng xuất, THE Web_App SHALL xóa token JWT và chuyển về trang đăng nhập.

### Requirement 24: Tối ưu SEO và metadata (P2)

**User Story:** Là chủ sở hữu website, tôi muốn portfolio được tối ưu cho công cụ tìm kiếm và chia sẻ mạng xã hội, để tăng khả năng được tìm thấy.

#### Acceptance Criteria

1. THE Web_App SHALL cung cấp metadata tiêu đề (title) và mô tả (description) cho từng trang công khai.
2. THE Web_App SHALL cung cấp các thẻ Open Graph và Twitter Card cho từng trang công khai để hỗ trợ xem trước khi chia sẻ.
3. THE Web_App SHALL cung cấp một tệp `sitemap.xml` liệt kê các trang công khai.
4. THE Web_App SHALL cung cấp một tệp `robots.txt`.
5. WHERE một trang chi tiết Project hoặc Blog_Post được hiển thị, THE Web_App SHALL cung cấp metadata phản ánh nội dung của bản ghi tương ứng.

### Requirement 25: Khả năng tiếp cận (Accessibility WCAG AA) (P2)

**User Story:** Là một Visitor sử dụng công nghệ hỗ trợ, tôi muốn website có khả năng tiếp cận tốt, để tôi có thể sử dụng đầy đủ chức năng.

#### Acceptance Criteria

1. THE Web_App SHALL cung cấp văn bản thay thế (alt text) cho các hình ảnh mang nội dung.
2. THE Web_App SHALL bảo đảm các phần tử tương tác có thể truy cập và kích hoạt được bằng bàn phím.
3. THE Web_App SHALL bảo đảm tỷ lệ tương phản màu của văn bản đáp ứng ngưỡng WCAG_AA mức AA.
4. THE Web_App SHALL hiển thị chỉ báo tiêu điểm (focus indicator) rõ ràng cho các phần tử tương tác khi điều hướng bằng bàn phím.
5. THE Web_App SHALL sử dụng các vùng mốc (landmark) và thuộc tính ARIA phù hợp cho cấu trúc trang và các thành phần động.
6. WHERE người dùng đã bật Reduced_Motion, THE Web_App SHALL tôn trọng tùy chọn này theo Requirement 8.

### Requirement 26: Kiểm thử tự động (xuyên suốt các giai đoạn)

**User Story:** Là một lập trình viên, tôi muốn có bộ kiểm thử tự động, để tôi tin tưởng vào tính đúng đắn và tránh hồi quy (regression).

#### Acceptance Criteria

1. THE API_Server SHALL có kiểm thử tự động cho các endpoint của Public_API và Admin_API.
2. THE Web_App SHALL có kiểm thử tự động cho các thành phần và logic không phụ thuộc kết xuất 3D.
3. WHEN bộ kiểm thử được chạy ở chế độ một lần (không watch), THE bộ kiểm thử SHALL thực thi và báo cáo kết quả mà không yêu cầu tương tác thủ công.
4. THE dự án SHALL cung cấp lệnh chạy kiểm thử cho cả Web_App và API_Server.
