# Tìm kiếm và bộ lọc tour

Đã kiểm tra ngày 08/11/2026 trên MySQL và giao diện React/Vite đang chạy.

## Hành vi

- Từ khóa tìm một phần nội dung trong tên, mã tour, mô tả ngắn, điểm đến và nơi
  khởi hành. Hỗ trợ một ký tự, chữ hoa/thường, tiếng Việt có dấu/không dấu,
  bao gồm `đ`/`d`. Khoảng trắng đầu/cuối và khoảng trắng liên tiếp được chuẩn hóa.
- Điểm đến tìm theo dữ liệu được gắn với tour; nơi khởi hành cho phép nhập một
  phần tên thành phố. Các bộ lọc khác nhau kết hợp bằng AND.
- Ký tự `%`, `_`, `!` được tìm đúng theo ký tự người dùng nhập; dữ liệu tìm kiếm
  truyền bằng tham số SQL.
- Khoảng giá và số ngày bao gồm cả hai đầu mút. Khoảng đảo ngược bị từ chối ở
  giao diện và API. Giá lấy từ lịch OPEN chưa qua ngày khởi hành; bỏ lịch cũ/đóng.
- Sắp xếp giá đặt tour chưa có giá xuống cuối ở cả hai chiều. Phân trang có thứ
  tự ổn định, không nhân bản tour có nhiều danh mục.
- API công khai chỉ trả tour PUBLISHED chưa xóa, kể cả khi người dùng sửa tham
  số trạng thái trên URL.

## Kết quả với 6 tour mẫu hiện có

| Thao tác | Kết quả |
|---|---|
| Từ khóa `H` | 6 tour; tên hoặc mô tả của cả 6 đều chứa chữ này |
| Từ khóa `Long` | Hạ Long |
| Từ khóa `Hội` hoặc `Hoi An` | Đà Nẵng – Hội An |
| Từ khóa `da lat`, `ĐÀ LẠT`, `  Da   Lat  ` | Đà Lạt |
| Điểm đến `long` / nút Hạ Long | Hạ Long |
| Sáu nút điểm đến phổ biến | Mỗi nút trả đúng một tour tương ứng |
| Khởi hành `Hà` / `ha noi` | 4 tour khởi hành từ Hà Nội |
| Khởi hành `ho chi minh` | 2 tour khởi hành từ TP. Hồ Chí Minh |
| Giá từ 3.000.000đ đến 4.000.000đ | Hạ Long và Sa Pa |
| Số ngày tối thiểu = tối đa = 3 | Đà Lạt, Sa Pa, Phú Quốc |
| Danh mục Nghỉ dưỡng | Đà Lạt và Phú Quốc |
| Từ khóa + điểm đến + khởi hành + danh mục + giá + số ngày | Giữ đúng giao của các điều kiện |
| Từ khóa không tồn tại / `%` / `_` | Trạng thái không có kết quả, có thao tác xóa bộ lọc |
| Giá tăng/giảm, tên, đánh giá, ngày tạo, số ngày tăng/giảm | Danh sách hiển thị đúng thứ tự API trả về |
| Phân trang API, 2 tour/trang | 3 trang, đủ 6 tour, không lặp |

Các tour mẫu hiện chưa có đánh giá nên lựa chọn "Đánh giá cao" có thể giữ nguyên
thứ tự. Bộ kiểm thử MySQL riêng dùng điểm đánh giá khác nhau để kiểm tra thực
sự điều kiện sắp xếp này.

## Kiểm thử và chạy lại

Từ thư mục `backend`:

```powershell
npm.cmd run test:search
```

Bộ này gồm 47 bài kiểm thử tích hợp, dùng database MySQL tên ngẫu nhiên riêng
`tour_search_test_*` và dọn database sau khi chạy. Có các trường hợp nhiều danh
mục, nhiều lịch/giá, giá 0, chưa có giá, Unicode phân rã, ký tự SQL, khoảng lọc sai,
tour ẩn/nháp/xóa và phân trang. Không sửa database ứng dụng khi chạy test.

Đã kiểm tra thêm bằng trình duyệt trên backend thật: tìm kiếm từ thanh đầu trang,
trang chủ, thanh bộ lọc; các nút điểm đến; lựa chọn sắp xếp; xóa từng/tất cả bộ
lọc; báo lỗi khoảng lọc; trạng thái rỗng; bật/ẩn bộ lọc ở chiều rộng 390 px.

## Bổ sung dữ liệu điểm đến cho bản cài cũ

Các tour mẫu trước đây chưa được gắn điểm đến. Từ thư mục `backend`, chạy:

```powershell
npm.cmd run db:seed:destinations
```

Lệnh bổ sung 11 điểm đến/liên kết còn thiếu cho 6 mã tour DEMO. Tour đã có điểm
đến được giữ nguyên, chạy lại không tạo trùng. `db:seed:tours` cũng bổ sung các
liên kết này khi cài mới. Tour do quản trị viên tạo sử dụng các điểm đến được gán
trong form quản lý tour.
