# Thuyết trình: Luồng nghiệp vụ theo vai trò — ViVu Travel

> Tài liệu tổng hợp từ các file trong `docs/` để dùng khi thuyết trình đồ án.
> Hệ thống: **Hệ thống quản lý tour du lịch ViVu Travel** — Frontend React + Vite, Backend NestJS, MySQL.

---

## 1. Mở đầu — Bài toán và phạm vi

### 1.1 Bài toán
Một công ty du lịch cần một nền tảng số hoá toàn bộ vòng đời một tour: từ lúc khách tìm hiểu, đặt chỗ, trả tiền, cho tới lúc khởi hành, kết thúc chuyến đi và đánh giá. Đồng thời công ty cần công cụ để nhân viên vận hành hằng ngày và quản trị viên kiểm soát toàn hệ thống.

### 1.2 Ba nhóm người dùng chính
| Vai trò | Mô tả | Khu vực làm việc |
| --- | --- | --- |
| **CUSTOMER** (Khách hàng) | Đặt tour và quản lý đơn của mình | Website khách hàng `#/` |
| **STAFF** (Nhân viên) | Vận hành tour, đơn đặt và thanh toán | Không gian nghiệp vụ `#/staff` |
| **ADMIN** (Quản trị viên) | Toàn quyền hệ thống | Khu vực quản trị `#/admin` |

> Backend còn định nghĩa vai trò **GUIDE** (hướng dẫn viên — nhận lịch và điểm danh khách) trong bộ enum, nhưng giao diện hiện tại tập trung vào ba vai trò trên.

### 1.3 Nguyên tắc thiết kế xuyên suốt
- **Ba khu vực giao diện tách biệt**: khách hàng, STAFF, ADMIN — mỗi khu vực có cổng đăng nhập và bố cục riêng.
- **Phân quyền hai lớp**: `role` (CUSTOMER / STAFF / GUIDE / ADMIN) và `permission` dạng `resource:action`.
- **Backend là nơi thực thi quyền**, không chỉ ẩn menu ở frontend.
- **Không tạo dữ liệu giả**: mọi con số, giá, đánh giá đều lấy từ API.

---

## 2. Kiến trúc tổng quan

```
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite, hash routing)                       │
│  ┌────────────┐   ┌────────────┐   ┌────────────────────┐    │
│  │ Khách hàng │   │   STAFF    │   │       ADMIN        │    │
│  │   #/       │   │  #/staff   │   │      #/admin       │    │
│  └────────────┘   └────────────┘   └────────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST API (/api)
┌───────────────────────────▼──────────────────────────────────┐
│  BACKEND (NestJS)                                            │
│  Guard toàn cục: Throttler → JwtAuth → Roles → Permissions   │
│  Modules: Auth, Users, Catalog, Schedule, Booking, Payment,  │
│           Promotion, Review, Notification, Support,          │
│           Operations, Supplier, System, Upload, Mail,        │
│           Maintenance                                        │
└───────────────────────────┬──────────────────────────────────┘
                            │ TypeORM
┌───────────────────────────▼──────────────────────────────────┐
│  MySQL                                                       │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Thứ tự guard bảo mật (rất quan trọng khi thuyết trình)
1. **ThrottlerGuard** — giới hạn 300 request/phút/IP; các endpoint nhạy cảm (login, register, quên mật khẩu) siết riêng.
2. **JwtAuthGuard** — mọi endpoint mặc định **yêu cầu đăng nhập**; muốn công khai phải gắn `@Public()`.
3. **RolesGuard** — kiểm tra vai trò.
4. **PermissionsGuard** — kiểm tra quyền chi tiết.

> Điểm nhấn: permission được **đọc từ DB mỗi request** (không nhúng vào JWT), nên khi thu hồi quyền thì có hiệu lực ngay lập tức.

---

## 3. Ma trận phân quyền

### 3.1 Bộ quyền theo vai trò
| Vai trò | Số quyền | Nhóm quyền chính |
| --- | --- | --- |
| **CUSTOMER** | 2 | `tour:read`, `booking:create` |
| **GUIDE** | 5 | `tour:read`, `schedule:read`, `booking:read`, `guide:attend`, `incident:manage` |
| **STAFF** | 11 | `user:read`, `tour:read`, `schedule:read`, `booking:read/create/confirm/cancel`, `payment:read`, `notification:manage`, `support:manage`, `file:upload` |
| **ADMIN** | 26 (toàn bộ) | Tất cả quyền hệ thống |

### 3.2 Những gì STAFF **không** có (câu hỏi hay gặp khi bảo vệ)
- `role:manage` — không phân quyền
- `user:manage` — không sửa/khoá/xoá người dùng
- `tour:write` / `tour:delete` — không sửa/xoá tour
- `system:setting` — không đổi cấu hình hệ thống
- `report:read` — không xem báo cáo doanh thu
- `payment:refund` — không hoàn tiền

> Khi STAFF không thấy các mục này trên menu, đó là **hành vi phân quyền đúng**, không phải lỗi.

---

## 4. LUỒNG 1 — KHÁCH HÀNG (CUSTOMER)

### 4.1 Sơ đồ luồng tổng quát

```
Truy cập website
      │
      ▼
[Trang chủ] ──► [Khám phá tour] ──► [Chi tiết tour]
      │                                   │
      │                                   ▼
      │                          [Chọn lịch khởi hành]
      │                                   │
      │                                   ▼
      │                          [Nhập hành khách + mã ưu đãi]
      │                                   │
      │                                   ▼
      │                          [Báo giá từ server]
      │                                   │
      │                                   ▼
      │                          [Tạo đơn: PENDING_PAYMENT]
      │                                   │
      │                                   ▼
      │                          [Thanh toán]
      │                                   │
      │                                   ▼
      │                    [PENDING_CONFIRMATION] ──► [STAFF xác nhận]
      │                                   │                    │
      │                                   │                    ▼
      │                                   │              [CONFIRMED]
      │                                   │                    │
      │                                   │                    ▼
      │                                   │            [COMPLETED] ──► [Đánh giá]
      │                                   ▼
      └──────────────────────────► [Yêu cầu hủy] ──► [STAFF duyệt/từ chối]
```

### 4.2 Các bước chi tiết

**Bước 1 — Đăng ký / Đăng nhập**
- Đăng ký tại `#/login` → **Đăng ký ngay**.
- Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số; tối đa 72 ký tự.
- Đăng nhập: access token JWT ngắn hạn (15 phút) + refresh token xoay vòng mỗi lần dùng.
- Quên mật khẩu: `#/forgot-password` — hiện ở mức **demo cục bộ**, chưa gửi email thật.

**Bước 2 — Khám phá tour**
- Trang chủ: banner, bộ tìm kiếm, điểm đến gợi ý, tour nổi bật từ API.
- Danh sách tour `#/tours`: lọc theo từ khoá, điểm đến, thành phố khởi hành, khoảng giá, số ngày, danh mục; sắp xếp và phân trang **phía server**.
- Chi tiết tour `#/tours/:id`: lịch trình, ảnh, điểm đến, chính sách huỷ, đánh giá đã duyệt, lịch khởi hành.

**Bước 3 — Đặt tour** (`#/booking/:scheduleId`)
- Nhập thông tin liên hệ + danh sách hành khách (họ tên, ngày sinh).
- **Loại vé và giá do backend tự suy ra** từ ngày sinh và lịch khởi hành — client không gửi giá.
- Bấm **Báo giá** → server trả về báo giá (dùng chung thuật toán với lúc tạo đơn).
- Báo giá **không giữ chỗ**; nút xác nhận bị khoá nếu báo giá báo hết chỗ.
- Tạo đơn thành công → trạng thái `PENDING_PAYMENT`.

**Bước 4 — Thanh toán** (`#/payment/:bookingId`)
- Chỉ hiện nút tạo giao dịch khi `bookingStatus = PENDING_PAYMENT` và số tiền còn phải trả > 0.
- Phương thức: **Chuyển khoản ngân hàng**, **VNPay**, **MoMo** (hai cổng sau là **giả lập**).
- Chuyển khoản: khách gửi **đường dẫn ảnh chứng từ** → trạng thái `PROOF_SUBMITTED` → chờ nhân viên đối chiếu.
- Tạo giao dịch chỉ gửi `bookingId` và `method` — **không gửi số tiền từ trình duyệt**.
- Hiển thị riêng biệt: tiền đã nhận / tiền hoàn / còn phải trả.

**Bước 5 — Theo dõi đơn** (`#/bookings`, `#/bookings/:id`)
- Các tab: Tổng quan, Thông tin hành khách, Lịch trình, Thanh toán, Chính sách, Hỗ trợ.
- Tiến trình **không tự đánh dấu đã thanh toán** khi chưa có dữ liệu xác nhận.

**Bước 6 — Yêu cầu huỷ**
- Khách gửi yêu cầu huỷ → trạng thái `CANCEL_REQUESTED`.
- **Phí huỷ được tính và chụp lại vào `policy_snapshot`** ngay tại thời điểm gửi.
- Không huỷ ngay, không tự phê duyệt hoàn tiền — chờ STAFF xử lý.

**Bước 7 — Đánh giá**
- Chỉ viết được khi đơn ở trạng thái `COMPLETED`.
- Đánh giá mới ở trạng thái `PENDING` → chờ ADMIN kiểm duyệt → `VISIBLE` mới hiện công khai.

**Bước 8 — Các chức năng phụ trợ**
- Yêu thích tour (`#/favorites`), hồ sơ & đổi mật khẩu (`#/account`), thông báo in-app (`#/notifications`), yêu cầu CSKH (`#/support`).

### 4.3 Trạng thái đơn đặt tour (BookingStatus)
| Trạng thái | Ý nghĩa |
| --- | --- |
| `PENDING_PAYMENT` | Vừa tạo đơn, chờ thanh toán |
| `PENDING_CONFIRMATION` | Đã thanh toán, chờ nhân viên xác nhận |
| `CONFIRMED` | Đã xác nhận, đã tăng số chỗ bán |
| `CANCEL_REQUESTED` | Khách đã gửi yêu cầu huỷ |
| `CANCELLED` | Đã huỷ |
| `REJECTED` | Bị từ chối |
| `EXPIRED` | Hết hạn (job định kỳ dọn) |
| `COMPLETED` | Chuyến đi đã kết thúc |

---

## 5. LUỒNG 2 — NHÂN VIÊN (STAFF)

### 5.1 Sơ đồ luồng tổng quát

```
Đăng nhập #/staff/login
      │
      ▼
[Dashboard STAFF] ──► số liệu theo quyền (không có doanh thu)
      │
      ├──► [Xử lý đơn đặt tour] ──► Xác nhận / Từ chối / Duyệt huỷ
      ├──► [Đối chiếu thanh toán] ──► Duyệt / Từ chối chứng từ
      ├──► [Lịch khởi hành] ──► Tra cứu, điểm đón, số chỗ
      ├──► [Tra cứu khách hàng] ──► Xem hồ sơ (chỉ đọc nếu thiếu quyền)
      ├──► [Yêu cầu hỗ trợ] ──► Trả lời ticket CSKH
      └──► [Gửi thông báo] ──► Thông báo in-app cho khách
```

### 5.2 Các bước chi tiết

**Bước 1 — Đăng nhập**
- Cổng riêng `#/staff/login`. Tài khoản do ADMIN tạo.
- Nếu tài khoản có cả ADMIN và STAFF → **ưu tiên ADMIN**.
- STAFF mở link Admin → tự chuyển về `#/staff`; ADMIN mở khu vực STAFF → chuyển về `#/admin`.

**Bước 2 — Dashboard**
- Bốn thẻ số liệu lấy từ `total` của API booking, khách hàng, yêu cầu huỷ và lịch từ hôm nay.
- **Không có API doanh thu cho STAFF** → thay ô doanh thu bằng yêu cầu huỷ.
- Biểu đồ dựa trên tối đa 100 booking gần nhất, có ghi rõ phạm vi.
- Không gán phần trăm tăng trưởng giả.

**Bước 3 — Xử lý đơn đặt tour** (`#/staff?tab=bookings`)
- Bảng phân trang, tìm theo mã/tên/số điện thoại, lọc trạng thái và khoảng ngày khởi hành.
- Chi tiết đơn: liên hệ, hành khách, giá trị, lịch sử yêu cầu huỷ, snapshot phí/tiền hoàn.
- **Xác nhận đơn** → `CONFIRMED`, tăng `sold_seats` của lịch, nhả chỗ đang giữ (idempotent).
- **Từ chối đơn** → `REJECTED`, nhả chỗ.
- **Duyệt yêu cầu huỷ** → gửi `approve: true`; **từ chối** → `approve: false` + lý do bắt buộc.
- Mọi thao tác đều kiểm tra trạng thái/quyền và **yêu cầu xác nhận trước khi gửi**.

**Bước 4 — Đối chiếu thanh toán** (`#/staff?tab=payments`)
- Xem danh sách giao dịch, lọc theo trạng thái/phương thức.
- **Duyệt chứng từ** → ghi nhận thanh toán, đơn chuyển sang `PENDING_CONFIRMATION`.
- **Từ chối chứng từ** → kèm lý do.
- Xem nhật ký webhook để đối soát.
- STAFF **không có** `payment:refund` → không tạo/xác nhận hoàn tiền.

**Bước 5 — Lịch khởi hành** (`#/staff?tab=schedules`)
- Lọc ngày/trạng thái; xem số chỗ đã bán / đang giữ / còn trống, giá vé, điểm tập trung, checkpoint.
- STAFF không có `schedule:write` → **chỉ đọc**.
- Tài khoản được cấp `schedule:write` có biểu mẫu thêm/sửa/xoá và nhập **lịch đón & điểm hẹn** (tối đa 30 điểm, ngày 1–365).
- Liên kết chéo: từ chi tiết đơn mở đúng lịch (`#/staff?tab=schedules&schedule=ID`) và ngược lại.

**Bước 6 — Tra cứu khách hàng** (`#/staff?tab=customers`)
- Tìm kiếm, xem hồ sơ phục vụ nghiệp vụ.
- Chỉ chỉnh được tên/điện thoại **nếu có** `user:manage` (STAFF mặc định không có).

**Bước 7 — Hỗ trợ CSKH** (`#/staff?tab=support`)
- Tiếp nhận ticket, đọc trao đổi, trả lời, cập nhật trạng thái xử lý.
- Đây là **ticket**, không phải live chat.

**Bước 8 — Gửi thông báo** (`#/staff?tab=notify`)
- Gửi thông báo in-app cho tài khoản khách hàng.

### 5.3 Điểm nhấn khi thuyết trình
- **Tách shell giao diện**: STAFF có sidebar xanh dương/trắng riêng, không dùng Navbar/Footer khách hàng, không dùng sidebar Admin.
- **Menu allowlist theo quyền**: chỉ 6 mục nghiệp vụ; tab không được phép sẽ hiển thị từ chối truy cập.
- **Không có màn giả**: không thêm menu đặt tour tại quầy, quản lý sản phẩm, báo cáo hay cấu hình khi chưa có màn STAFF tương ứng.

---

## 6. LUỒNG 3 — QUẢN TRỊ VIÊN (ADMIN)

### 6.1 Sơ đồ luồng tổng quát

```
Đăng nhập #/admin/login
      │
      ▼
[Dashboard tổng quan] ──► tour/đơn/chờ xác nhận, dòng tiền, biểu đồ
      │
      ├── SẢN PHẨM ──► Tour & lịch trình, Danh mục, Địa điểm, Lịch khởi hành, Khuyến mãi
      ├── NGHIỆP VỤ ──► Đơn đặt tour, Thanh toán, Hoàn tiền, Khách hàng,
      │                 Kiểm duyệt đánh giá, Hỗ trợ CSKH, Gửi thông báo
      ├── HỆ THỐNG ──► Nhân viên & vai trò, Banner, Chính sách huỷ, Cấu hình
      └── BÁO CÁO ──► Thống kê doanh thu, xuất CSV
```

### 6.2 Các bước chi tiết

**Bước 1 — Đăng nhập & Dashboard**
- Cổng riêng `#/admin/login`, bố cục sidebar + thanh tài khoản riêng.
- Dashboard: tổng tour/đơn/chờ xác nhận, dòng tiền theo tháng, booking theo trạng thái, đơn gần đây, tour được đặt nhiều, khách mới, lịch sắp tới.
- **Dòng tiền = tiền nhận chưa trừ hoàn, không phải lợi nhuận** (cần nói rõ khi thuyết trình).

**Bước 2 — Quản lý sản phẩm**
- **Tour & lịch trình**: thêm/sửa/xoá/ẩn/hiện; cập nhật lịch trình từng ngày qua mảng JSON.
- **Danh mục & Địa điểm**: CRUD, địa điểm có toạ độ.
- **Lịch khởi hành**: CRUD ngày, số chỗ, giá theo loại khách, trạng thái.
- **Khuyến mãi**: CRUD mã, giới hạn lượt, thời hạn, bật/tắt.

**Bước 3 — Xử lý đơn & thanh toán**
- **Đơn đặt tour**: xem hành khách/yêu cầu huỷ, xác nhận/từ chối/huỷ/duyệt yêu cầu.
- **Thanh toán**: danh sách/duyệt/từ chối chứng từ.
- **Hoàn tiền**: tạo yêu cầu hoàn, xác nhận đã chuyển tiền, đánh dấu thất bại.
  - Hệ thống **không tự chuyển tiền ngân hàng** — chỉ ghi nhận.

**Bước 4 — Quản lý người dùng**
- **Khách hàng**: tìm, sửa tên/điện thoại, khoá/mở.
- **Nhân viên & vai trò**: tạo tài khoản STAFF, gán vai trò, khoá/mở.
- Chặn tự khoá / tự xoá / tự gán vai trò cho chính mình.

**Bước 5 — Nội dung & kiểm duyệt**
- **Kiểm duyệt đánh giá**: duyệt công khai (`VISIBLE`) hoặc ẩn (`HIDDEN`).
- **Hỗ trợ CSKH**: quản lý ticket và trạng thái xử lý.
- **Gửi thông báo**: thông báo in-app cho tài khoản.
- **Banner trang chủ**: CRUD, banner active hiển thị trên trang chủ.

**Bước 6 — Báo cáo & cấu hình**
- **Thống kê doanh thu** (`#/admin?tab=reports`, cần `report:read`): theo ngày/tháng/năm, lọc kỳ nhận/hoàn tiền.
- Xuất **CSV UTF-8** mở bằng Excel; in/lưu PDF bằng trình duyệt.
- **Cấu hình hệ thống**: cấu hình JSON, chính sách huỷ; `contact`/`bank` được public theo allowlist.

### 6.3 Điểm nhấn khi thuyết trình
- **Menu thực tế hiển thị theo quyền** nhận từ backend.
- **Không giả số tăng trưởng hoặc badge thông báo**.
- **Báo cáo CSV chống công thức** (chống CSV injection).

---

## 7. LUỒNG XUYÊN VAI TRÒ — Vòng đời một đơn đặt tour

Đây là phần **quan trọng nhất** khi thuyết trình, vì nó cho thấy ba vai trò phối hợp thế nào.

```
KHÁCH HÀNG                    HỆ THỐNG                     STAFF / ADMIN
    │                             │                              │
    │ 1. Chọn lịch + hành khách   │                              │
    ├────────────────────────────►│                              │
    │                             │ 2. Báo giá (server tính)     │
    │◄────────────────────────────┤                              │
    │ 3. Tạo đơn                  │                              │
    ├────────────────────────────►│ → PENDING_PAYMENT            │
    │                             │                              │
    │ 4. Thanh toán               │                              │
    ├────────────────────────────►│ → PROOF_SUBMITTED            │
    │                             │                              │
    │                             │ 5. STAFF duyệt chứng từ      │
    │                             │◄─────────────────────────────┤
    │                             │ → PENDING_CONFIRMATION       │
    │                             │                              │
    │                             │ 6. STAFF xác nhận đơn        │
    │                             │◄─────────────────────────────┤
    │                             │ → CONFIRMED (tăng sold_seats)│
    │                             │                              │
    │                             │ 7. Chuyến đi kết thúc        │
    │                             │ → COMPLETED                  │
    │                             │                              │
    │ 8. Viết đánh giá            │                              │
    ├────────────────────────────►│ → PENDING                    │
    │                             │ 9. ADMIN kiểm duyệt          │
    │                             │◄─────────────────────────────┤
    │                             │ → VISIBLE (hiện công khai)   │
```

### 7.1 Nhánh huỷ đơn
```
KHÁCH HÀNG                    HỆ THỐNG                     STAFF
    │ 1. Gửi yêu cầu huỷ          │                              │
    ├────────────────────────────►│ → CANCEL_REQUESTED           │
    │                             │ (chụp policy_snapshot)       │
    │                             │ 2. Duyệt / Từ chối           │
    │                             │◄─────────────────────────────┤
    │                             │ → CANCELLED / giữ nguyên     │
    │                             │ 3. ADMIN tạo hoàn tiền       │
    │                             │    (payment:refund)          │
```

### 7.2 Quy tắc nghiệp vụ cần nhấn mạnh
1. **Tạo đơn ≠ đã thanh toán ≠ đã xác nhận** — ba trạng thái độc lập.
2. **Thanh toán thành công** đưa đơn sang `PENDING_CONFIRMATION`; **nhân viên xác nhận** mới ghi tăng số chỗ bán.
3. **Báo giá không giữ chỗ**; chỉ tạo đơn mới giữ chỗ (trong một transaction).
4. **Phí huỷ chụp tại thời điểm gửi yêu cầu**, không tính lại lúc duyệt.
5. **Không tự hoàn tiền** — hoàn tiền là thao tác thủ công của ADMIN.
6. **Đánh giá chỉ khi `COMPLETED`** và phải qua kiểm duyệt.

---

## 8. Bảo mật — Các điểm đáng nói

| Rủi ro | Cách xử lý |
| --- | --- |
| Lộ hash mật khẩu | Cột `password_hash` khai báo `select: false` |
| Brute-force | Đếm `failed_login_count`, khoá tạm 5 lần / 15 phút |
| Token bị đánh cắp | Refresh token lưu dạng hash SHA-256, xoay vòng mỗi lần dùng |
| Leo thang đặc quyền | Permission đọc từ DB mỗi request, thu hồi có hiệu lực ngay |
| Tự khoá / tự xoá mình | Endpoint `status`/`roles`/`DELETE` chặn thao tác lên chính mình |
| Spam / quét hàng loạt | Rate limit 300 req/phút/IP, siết riêng endpoint nhạy cảm |
| Webhook giả | Bắt buộc chữ ký HMAC-SHA256 |
| CSV injection | Xuất CSV chống công thức |

---

## 9. Kịch bản demo gợi ý (5–7 phút)

1. **Mở trang chủ** → giới thiệu giao diện travel editorial, tìm kiếm tour.
2. **Đăng ký khách hàng mới** → đặt một tour → báo giá → tạo đơn.
3. **Thanh toán** → chọn chuyển khoản → gửi chứng từ.
4. **Chuyển sang STAFF** (cửa sổ ẩn danh) → duyệt chứng từ → xác nhận đơn.
5. **Quay lại khách hàng** → xem đơn đã `CONFIRMED`.
6. **Chuyển sang ADMIN** → xem dashboard, kiểm duyệt đánh giá, xem báo cáo.
7. **Nhấn mạnh**: STAFF không thấy menu Hoàn tiền/Báo cáo/Cấu hình — đó là phân quyền đúng.

> Mẹo: dùng **cửa sổ ẩn danh riêng** cho từng vai trò để không phải đăng xuất liên tục.

---

## 10. Giới hạn hiện tại & hướng phát triển

### 10.1 Giới hạn cần nói rõ (thể hiện sự trung thực)
- Chưa gửi **email thật**; khôi phục mật khẩu còn ở mức demo.
- Thanh toán **VNPay/MoMo là giả lập**; chưa có VietQR/cổng thật.
- Chưa upload chứng từ từ máy — chỉ gửi đường dẫn ảnh.
- Thông báo **chưa realtime/email**.
- Báo cáo xuất **CSV**, chưa có `.xlsx`/PDF server.
- Một số biểu mẫu quản trị nâng cao dùng **JSON** thay editor trực quan.
- Chưa có **kiểm thử E2E tự động trên trình duyệt** đầy đủ.

### 10.2 Hướng phát triển
1. Tích hợp dịch vụ email thật, bỏ reset token demo.
2. Cổng thanh toán thật / VietQR, upload chứng từ.
3. Thông báo tự động khi đổi lịch + realtime.
4. Xuất `.xlsx`/PDF chuyên dụng, bộ lọc báo cáo nâng cao.
5. Editor lịch trình/ảnh/chính sách trực quan thay JSON.
6. Kiểm thử E2E, rà soát bảo mật trước triển khai công khai.

---

## 11. Câu hỏi thường gặp khi bảo vệ

**Q: Tại sao tách ba giao diện thay vì một?**
A: Mỗi vai trò có nhu cầu và mức độ rủi ro khác nhau. Tách shell giúp giảm nhầm lẫn thao tác, giảm bề mặt tấn công, và menu chỉ hiện đúng quyền. Vẫn dùng chung một ứng dụng React và một API — không phải ba bản triển khai.

**Q: Nếu STAFF cố truy cập API hoàn tiền thì sao?**
A: Backend chặn bằng `PermissionsGuard` — trả 403. Ẩn menu chỉ là lớp trải nghiệm, không phải lớp bảo vệ.

**Q: Tại sao giá không gửi từ client?**
A: Chống sửa giá. Server tính lại từ ngày sinh hành khách và lịch khởi hành; số tiền thanh toán lấy từ `booking.total` ở server.

**Q: Tại sao phí huỷ chụp snapshot?**
A: Để khách và nhân viên thấy cùng một con số. Nếu chính sách thay đổi sau khi khách gửi yêu cầu, phí vẫn giữ theo thời điểm gửi.

**Q: Dòng tiền trên dashboard có phải lợi nhuận?**
A: Không. Đó là tiền nhận chưa trừ hoàn tiền. Lợi nhuận cần trừ chi phí nhà cung cấp — chưa triển khai.

**Q: Làm sao biết đơn đã thanh toán?**
A: Xem trạng thái giao dịch (`SUCCESS`) và số tiền đã nhận qua API payment, **không suy từ trạng thái booking**.

---

## 12. Tóm tắt một trang (dùng làm slide cuối)

| Vai trò | Vào bằng | Làm gì | Không được làm |
| --- | --- | --- | --- |
| **Khách hàng** | `#/login` | Tìm tour, đặt, thanh toán, huỷ, đánh giá, CSKH | Vào khu vực nội bộ |
| **Nhân viên** | `#/staff/login` | Xử lý đơn, đối chiếu thanh toán, lịch, CSKH, gửi thông báo | Phân quyền, sửa tour, hoàn tiền, xem báo cáo |
| **Quản trị viên** | `#/admin/login` | Toàn bộ: sản phẩm, đơn, tiền, người dùng, nội dung, báo cáo, cấu hình | — |

**Thông điệp chốt:** *Một hệ thống — ba vai trò — một dòng chảy nghiệp vụ khép kín từ tìm tour đến đánh giá, với phân quyền được thực thi ở backend.*
