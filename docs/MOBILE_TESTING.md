# Kiểm tra TourGo Mobile — 09/11/2026

## Phạm vi và môi trường

Expo SDK 57, React Native 0.86.3, Node.js 24. Kiểm tra giao diện bằng bản Expo
web trong Microsoft Edge, viewport 320×844, 390×844 và 768×844. Đối chiếu trang
chủ, logo, màu sắc, ảnh điểm đến và thẻ tour với website hiện có.

Các luồng ghi dữ liệu được chạy với ứng dụng NestJS và MySQL thật trong database
ngẫu nhiên `tour_mobile_test_<12 ký tự hex>`. Chỉ chặn hướng gọi API của trình
duyệt sang backend kiểm thử; không thay kết quả API bằng dữ liệu giả. Database
kiểm thử được xóa khi kết thúc; mail transport được thay bằng bộ nhận kiểm thử.
Không tạo đơn hoặc giao dịch kiểm thử trong database đang dùng của dự án.

## Kết quả

| Nhóm | Nội dung đã kiểm tra | Kết quả |
| --- | --- | --- |
| Trang chủ và chi tiết | Tải tour từ API, điểm đến, ảnh, lịch khởi hành, chặn đặt tour khi chưa đăng nhập | Đạt |
| Tìm kiếm | Một chữ `H`, một từ `Long`, không dấu `da lat`, ký tự `%` được tìm như văn bản | Đạt trên 6 tour demo |
| Bộ lọc | Điểm đến, nơi khởi hành, giá, số ngày, danh mục và kết hợp tất cả trường | Đạt |
| Sắp xếp | Đủ 7 lựa chọn gửi đúng trường/chiều sắp xếp đến API và hiển thị kết quả | Đạt |
| Đăng ký | Tạo khách hàng, tự đăng nhập và quay về đúng lịch khởi hành đã chọn | Đạt |
| Hành khách | Ngày sinh tương lai bị chặn; thêm hành khách làm mất hiệu lực báo giá cũ; loại vé theo tuổi do server tính | Đạt |
| Ưu đãi | 10 mã, điều kiện đơn tối thiểu, giảm tiền cố định, phần trăm và mức giảm tối đa | Đạt |
| Tạo đơn | Tổng tiền trùng báo giá; ban đầu chờ thanh toán và chưa có hóa đơn | Đạt |
| VNPay giả lập | Ghi nhận tiền, phát hành hóa đơn; đơn vẫn chờ xác nhận chuyến đi | Đạt |
| Chuyển khoản | Gửi URL chứng từ và ghi chú, chờ nhân viên đối chiếu; chưa ghi nhận trả tiền hoặc xuất hóa đơn | Đạt |
| Đơn miễn phí | Phương thức `NO_CHARGE`, không yêu cầu chuyển tiền, phát hành hóa đơn tổng 0 | Đạt |
| Hủy đơn | Gửi yêu cầu chờ xử lý và lưu phí theo chính sách; không tự báo đã hoàn tiền | Đạt |
| Thông báo | Đọc thông báo đơn/thanh toán, đánh dấu tất cả đã đọc và kiểm tra dữ liệu lưu | Đạt |
| Yêu thích | Thêm, mở danh sách và bỏ yêu thích | Đạt |
| Đánh giá | Chỉ mở khi đơn hoàn thành; gửi ở trạng thái chờ duyệt, không còn nút gửi lần hai | Đạt |
| Hỗ trợ | Tạo yêu cầu, xem lịch sử và gửi phản hồi | Đạt |
| Tài khoản | Sửa hồ sơ, đổi mật khẩu, xóa phiên, đăng nhập bằng mật khẩu mới và đăng xuất | Đạt |
| Giao diện | Trang chủ 320/390/768 px; danh sách ưu đãi 320/390/768 px; báo giá/thanh toán/tài khoản 390 px không tràn ngang | Đạt |
| Lỗi chạy | Các luồng trên không phát sinh exception trình duyệt hoặc HTTP 500 | Đạt |

Ví dụ báo giá đã đối chiếu với database: người lớn 2.000.000 đ + trẻ em
1.000.000 đ, `TOURGO5` giảm tối đa 150.000 đ, tổng đơn 2.850.000 đ.

## Sửa trong đợt kiểm tra

- Thêm danh sách mã ưu đãi trên mobile; chọn mã chưa đồng nghĩa đã áp dụng.
  Hệ thống vẫn kiểm tra mã, hạn mức, giá và chỗ tại server khi báo giá/tạo đơn.
- Sửa nút **Xong** trong bộ chọn ngày sinh iOS để lưu ngày đang hiển thị dù chưa
  cuộn. Có nút quay lại để bỏ thay đổi; dùng callback tương ứng thư viện 9.1.0.
- So sánh ngày sinh bằng chuỗi ngày địa phương chuẩn, không dựa vào định dạng
  `toLocaleDateString('en-CA')`; kiểm tra mốc từ 1900 đến hôm nay.
- Cập nhật API và Expo theo IP Wi-Fi hiện tại, khởi động lại dịch vụ liên quan.

## Kiểm tra kỹ thuật

- `npm.cmd run typecheck`: đạt.
- `npm.cmd run lint`: đạt.
- `npm.cmd test`: 17/17 đạt, gồm API/refresh phiên, ngày sinh và bộ lọc.
- `npx.cmd expo-doctor`: 21/21 đạt.
- `npm.cmd run export:check`: tạo thành công bundle Android, iOS/Hermes và web.
- Expo dev server trả bundle iOS HTTP 200; API health và CORS trả đúng cho origin
  localhost và IP Wi-Fi hiện tại.

Ảnh và kết quả từng lần chạy nằm trong `mobile/.artifacts/` trên máy kiểm thử,
không đưa vào Git. Các script trình duyệt trong thư mục này dùng Playwright cài
ở thư mục tạm của máy kiểm thử, không phải dependency để chạy ứng dụng.

## Cần kiểm tra trên iPhone thật

Chưa có kết quả thao tác trên thiết bị iPhone thật trong đợt này. Export thành
công chỉ xác nhận khả năng bundle, không xác nhận toàn bộ hành vi native.

1. Cùng Wi-Fi với máy tính, mở `/status` của Expo và `/api/health` của backend,
   rồi quét QR Expo mới. Khi đổi mạng phải dùng IP mới.
2. Chọn ngày sinh, bấm **Xong** cả khi có và không cuộn; kiểm tra bàn phím, nút
   quay lại và vùng an toàn ở đầu/cuối màn hình.
3. Chọn ảnh chứng từ trong thư viện, cấp/từ chối quyền ảnh và kiểm tra tải JPEG.
   Kiểm thử trình duyệt đã xác nhận gửi URL chứng từ, chưa thao tác thư viện ảnh iOS.
4. Mở AirPrint, lưu/chia sẻ PDF; mở lại ứng dụng để kiểm tra phiên SecureStore.

VNPay/MoMo hiện là cổng giả lập của đồ án. Đợt kiểm tra này không thu tiền thật
và không xác nhận gửi email tới hộp thư thực tế.
