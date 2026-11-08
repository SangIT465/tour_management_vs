# Mã giảm giá, hóa đơn và email thanh toán

## Cập nhật môi trường hiện có

Từ thư mục `backend`:

```powershell
npm.cmd install
npm.cmd run db:migrate
npm.cmd run dev
```

Migration `PaymentReceipts1794099600000` chỉ tạo bảng `mail_messages` và chỉ mục
`bookings(promotion_id, customer_id, status)`. Không xóa hoặc sửa các đơn, hóa đơn
hay thanh toán hiện có. TypeORM lưu lịch sử migration; chạy lại không tạo trùng.
Giữ `DB_SYNCHRONIZE=false` khi dùng database đã có dữ liệu.

## Cấu hình gửi email

Thêm các biến tương ứng từ `backend/.env.example` vào `backend/.env`:

```dotenv
MAIL_ENABLED=true
MAIL_FROM="TourGo <billing@your-domain.com>"
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password

INVOICE_SELLER_NAME=TourGo
INVOICE_SELLER_ADDRESS=
INVOICE_SELLER_EMAIL=billing@your-domain.com
INVOICE_SELLER_PHONE=
```

Port 465 dùng `SMTP_SECURE=true`. Port 587 dùng STARTTLS. Với Gmail, sử dụng thông
tin SMTP và mật khẩu ứng dụng do nhà cung cấp cấp; không ghi thông tin thật vào git.
Chi tiết tùy chọn: [Nodemailer SMTP](https://nodemailer.com/smtp).

Thử cục bộ bằng Mailpit: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`,
`SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=false`, bỏ trống user/password. Email chỉ
đến hộp thư thử nghiệm của Mailpit. Nếu chưa có SMTP, giữ `MAIL_ENABLED=false`:
thanh toán vẫn hoạt động, thư ở trạng thái chờ và sẽ được gửi sau khi bật lại.
Khởi động lại backend sau khi thay đổi `.env`.

### Gửi một email thử thật

Từ thư mục `backend`, sau khi điền cấu hình SMTP:

```powershell
npm.cmd run mail:test -- --to your-email@example.com
```

Lệnh sử dụng chính `MailTransportService` của ứng dụng để gửi một email kiểm tra
đến địa chỉ chỉ định. Không cần bật server hoặc kết nối MySQL, không gửi các thư
đang chờ trong outbox và không thay đổi `MAIL_ENABLED` của backend. Chỉ bật
`MAIL_ENABLED=true` và khởi động lại backend khi muốn gửi email thanh toán tự động.

Với Gmail: đặt `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`,
`SMTP_REQUIRE_TLS=true`, `SMTP_USER` là Gmail dùng để gửi, `MAIL_FROM` là cùng địa
chỉ đó (ví dụ `"TourGo <your-name@gmail.com>"`). Điền **mật khẩu ứng dụng** vào
`SMTP_PASSWORD` trong file `.env`; không dùng mật khẩu đăng nhập và không gửi mật
khẩu vào chat. Cần bật Xác minh 2 bước để tạo mật khẩu ứng dụng theo
[hướng dẫn Google](https://support.google.com/accounts/answer/185833?hl=vi).

Lệnh báo thành công khi máy chủ SMTP chấp nhận thư; kiểm tra cả Inbox và Spam.

Email được gửi đến **email liên hệ của đơn đặt tour**, có nội dung xác nhận thanh
toán, thông tin tour và tệp hóa đơn HTML đính kèm. SMTP nhận thư không đảm bảo thư
đã vào Inbox; khách cần kiểm tra cả Spam và cấu hình domain gửi theo nhà cung cấp.

## Cách sử dụng

- Admin quản lý mã trong mục **Khuyến mãi**: phần trăm hoặc số tiền, trần giảm,
  đơn tối thiểu, thời hạn, tổng lượt và lượt mỗi khách.
- Khách nhập mã ở trang đặt tour, bấm **Áp dụng** để lấy báo giá từ server. Thay
  đổi hành khách/mã sẽ hủy báo giá cũ; server luôn tính lại khi tạo đơn.
- Sau khi cổng xác nhận hoặc nhân viên duyệt chuyển khoản/thu tiền mặt, hệ thống
  tự phát hành một hóa đơn và lưu email vào hàng đợi trong cùng transaction.
- Khách mở **Thanh toán** hoặc **Chi tiết đơn** → **Xem / In hóa đơn** →
  **In / Lưu PDF**. Nhân viên có thể in trong phần chi tiết xử lý đơn.
- Đơn được giảm toàn bộ chi phí dùng **Xác nhận đơn miễn phí** (`NO_CHARGE`),
  vẫn có hóa đơn và email; không yêu cầu khách chuyển tiền.
- Nhận đủ tiền chuyển đơn sang `PENDING_CONFIRMATION`. Nhân viên vẫn xác nhận
  chuyến đi theo nghiệp vụ hiện có; email và hóa đơn không khẳng định đã duyệt chỗ.

Hóa đơn là chứng từ thanh toán dịch vụ, chưa tích hợp nhà cung cấp hóa đơn điện tử.
Khách lưu PDF bằng chức năng in của trình duyệt; không có URL PDF công khai chứa
thông tin khách. Khoản hoàn tiền được theo dõi riêng trong lịch sử thanh toán.

## Cấu trúc và tính nhất quán

- `promotion/`: kiểm tra điều kiện và giới hạn mã. Transaction tạo booking dùng
  `READ COMMITTED` và khóa dòng mã trước khi đếm lượt khách/giữ lượt tổng, tránh
  dùng vượt giới hạn khi nhiều request chạy đồng thời. Hủy/từ chối/hết hạn trả lượt.
- `booking/services/invoice.service.ts`: chỉ phát hành khi có giao dịch đã trả
  đủ tiền; khóa booking và unique index bảo đảm một hóa đơn cho mỗi đơn. Số hóa
  đơn có UUID để các đơn khác nhau không tranh chấp bộ đếm `MAX + 1`.
- `booking/templates/invoice.template.ts`: bản A4 dùng chung cho xem/in và email;
  escape dữ liệu khách, không tải font/ảnh/script bên ngoài.
- Snapshot lưu khách, tour, dòng vé, ưu đãi, số tiền và tham chiếu thanh toán tại
  thời điểm phát hành. Chỉnh sửa dữ liệu sau đó không làm thay đổi hóa đơn.
- `mail/`: transactional outbox, gửi nền mỗi 10 giây, tối đa 10 thư mỗi lượt.
  Khóa và lease token phối hợp nhiều worker; lease 2 phút cho phép phục hồi khi
  process dừng giữa chừng. Lỗi SMTP không làm mất giao dịch thanh toán.
- `payment/`: xác nhận thành công mới tạo hóa đơn/email. Webhook gọi lặp không
  tạo thêm thư. Khoản thanh toán muộn hoặc thanh toán trùng được đưa vào yêu cầu
  hoàn tiền, không gửi thêm hóa đơn xác nhận chuyến đi.

## Theo dõi và gửi lại thư lỗi

`mail_messages.status` có `PENDING`, `SENDING`, `SENT`, `FAILED`. Lỗi được thử lại
theo thời gian tăng dần, từ 30 giây đến tối đa 1 giờ, tối đa 8 lần. Chỉ lưu mã lỗi
SMTP, không lưu mật khẩu hoặc toàn bộ phản hồi SMTP vào log. API tổng hợp thanh
toán trả `receiptEmail.status` / `sentAt` cho chủ đơn hoặc nhân viên được cấp quyền.

Sau khi sửa cấu hình SMTP, quản trị viên có thể đưa **một thư FAILED đã kiểm tra**
về hàng đợi, với UUID thật thay cho placeholder:

```sql
UPDATE mail_messages
SET status = 'PENDING', attempts = 0, next_attempt_at = CURRENT_TIMESTAMP(3),
    lease_token = NULL, last_error = NULL
WHERE id = '<message-uuid>' AND status = 'FAILED';
```

Outbox có bảo đảm gửi ít nhất một lần: nếu SMTP nhận thư nhưng process dừng trước
khi lưu `SENT`, lần phục hồi có thể gửi lại. `Message-ID` ổn định giúp hệ thống
nhận nhận diện bản lặp; SMTP không có bảo đảm gửi đúng một lần. Có thể lưu trữ/xóa
nội dung email cũ theo chính sách dữ liệu của đơn vị sau khi gửi thành công.

Không tự động gửi lại email cho các giao dịch trước khi tính năng được cài.
Hóa đơn đã phát hành vẫn xem/in được; nhân viên dùng API phát hành hóa đơn hiện có
cho đơn cũ đã thanh toán nếu đơn đó chưa có hóa đơn.

## Kiểm thử

```powershell
# Trong backend
npm.cmd run build
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run test:checkout

# Trong frontend
npm.cmd run build
npm.cmd test
```

`test:checkout` cần MySQL và tài khoản có quyền tạo/xóa **database kiểm thử**. Bộ
test tự tạo tên `tour_checkout_test_<12 ký tự hex>`, kiểm tra tên trước khi tạo/xóa,
chỉ dùng dữ liệu giả và transport email giả. Không ghi đơn thử vào database ứng
dụng, không gửi email ra ngoài. Bộ test kiểm tra migration, quyền xem hóa đơn,
giới hạn mã đồng thời, lưu hóa đơn/email, thử lại email lỗi, chuyển khoản, tiền mặt,
ưu đãi toàn phần và thanh toán trùng.
