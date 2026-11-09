# TourGo Mobile · Android và iOS

Ứng dụng khách hàng viết bằng React Native, TypeScript và Expo SDK 57. Mobile gọi
backend NestJS hiện có: tài khoản, tour, đơn đặt, thanh toán, hóa đơn và email dùng
chung database với website. Admin và nhân viên vận hành qua website.

## Chức năng

- Đăng ký/đăng nhập, lưu phiên bằng SecureStore trên Android/iOS, làm mới phiên
  khi access token hết hạn. Preview web chỉ lưu phiên trong tab.
- Trang chủ dùng cùng logo, ảnh Hạ Long, nội dung, màu xanh dương và giá màu đỏ
  như website; có tour nổi bật và sáu điểm đến phổ biến. Ảnh điểm đến được đóng
  gói trong app, thông tin tour và giá luôn lấy từ backend.
- Khám phá tour: tìm từ khóa, điểm đến, nơi khởi hành; lọc danh mục, ngân sách,
  số ngày; sắp xếp giá, đánh giá, tên và thời gian. Xem ảnh, đánh giá khách hàng,
  lịch trình và lịch khởi hành trong chi tiết tour.
- Đặt tour cho nhiều hành khách, chọn ngày sinh, chọn/nhập/gỡ mã giảm giá từ
  danh sách ưu đãi còn dùng được; báo giá và kiểm tra chỗ được thực hiện ở server.
- Xem đơn, thanh toán, gửi yêu cầu hủy và xem phí hủy theo chính sách.
- Chọn ảnh chứng từ từ điện thoại, chuyển sang JPEG, tải lên backend và gửi nhân
  viên đối chiếu. VNPay/MoMo giữ chế độ giả lập như website.
- Xem trạng thái email, in hóa đơn và lưu/chia sẻ PDF bằng giao diện của thiết bị.
- Tour yêu thích, thông báo, hồ sơ, đổi mật khẩu, hỗ trợ CSKH và đánh giá sau tour.

Email do backend gửi khi thanh toán được ghi nhận, theo cấu hình SMTP và quy tắc
người nhận hiện có. Không lưu tài khoản SMTP hoặc mật khẩu trong app.

## Chạy trên điện thoại thật

Từ thư mục gốc dự án có thể chạy backend và mobile cùng lúc:

```powershell
npm.cmd run dev:mobile
# Nếu backend đã chạy, dùng lệnh này thay cho lệnh trên:
npm.cmd run dev:mobile -- --reuse-api
```

Lệnh này tự lấy IP mạng LAN cho API và Expo. Dừng phiên Expo cũ bằng `Ctrl+C`
trước khi chạy để giải phóng cổng `8081`. Các bước chạy riêng từng dịch vụ ở dưới.

Cần Node.js 24 LTS, database/backend đã khởi tạo và Expo Go tương thích SDK 57.
SDK này được chọn theo [hướng dẫn Expo cho thiết bị thật trong giai đoạn chuyển
SDK](https://docs.expo.dev/get-started/create-a-project/).

Terminal backend, từ thư mục gốc dự án:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

Terminal khác, từ thư mục gốc dự án:

```powershell
cd mobile
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Trong `mobile/.env`, đổi URL thành IP mạng LAN của máy chạy backend, ví dụ:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
```

Điện thoại và máy tính cần cùng Wi-Fi. `localhost` trên điện thoại chỉ chính điện
thoại đó. Nếu đổi cổng backend, đổi URL tương ứng. Khi đổi mạng/IP, cập nhật `.env`
và khởi động lại Expo. File `.env` trên máy hiện tại đã được điền IP Wi-Fi lúc
triển khai; file này không được commit.

```powershell
npm.cmd run api:check
npm.cmd start
```

Mở Expo Go trên Android/iPhone và quét QR Expo hiển thị. Có thể mở
`http://<IP-máy-tính>:3000/api/health` trong trình duyệt điện thoại để kiểm tra
mạng. Nếu không kết nối được, kiểm tra cùng Wi-Fi và quyền cho phép Node.js qua
Windows Firewall trên mạng nội bộ.

Nếu quét QR nhưng tải mãi, mở `http://<IP-máy-tính>:8081/status` trên trình duyệt
điện thoại. Kết quả đúng là `packager-status:running`. Nếu không mở được, kiểm tra
cùng Wi-Fi, quyền mạng nội bộ trên điện thoại và việc router có chặn các thiết bị
giao tiếp với nhau không. Địa chỉ `localhost`/`127.0.0.1` trong QR không dùng cho
điện thoại thật. Nếu `/status` mở được nhưng `/api/health` không mở được thì kiểm
tra backend và cổng API riêng.

Lần chạy đầu hoặc sau khi xóa cache, Metro cần tạo bundle trước khi app mở được.
Giữ terminal chạy và theo dõi dòng `Android Bundled` / `iOS Bundled`; lần mở đầu
có thể mất hơn một phút. Không xóa cache ở mọi lần khởi động.

Trên iPhone, đăng nhập cùng tài khoản Expo trong Expo Go và Expo CLI
(`npx.cmd expo login`), theo [hướng dẫn mở app trên thiết bị](https://docs.expo.dev/get-started/start-developing/).
Thanh điều hướng dưới gồm Trang chủ, Khám phá, Tour của tôi, Yêu thích và Tài khoản;
Thông báo mở bằng biểu tượng chuông ở đầu màn hình.

## Giả lập và preview web

- Android Emulator: cài Android Studio/SDK, mở emulator, đặt URL
  `http://10.0.2.2:3000/api` rồi chạy `npm.cmd run android`.
- iOS Simulator: cần macOS/Xcode, URL `http://localhost:3000/api`, chạy
  `npm.cmd run ios`.
- Preview trình duyệt: `npm.cmd run web`. Thêm origin Expo, thường là
  `http://localhost:8081`, vào `CORS_ORIGIN` của backend và khởi động lại backend.
  Website React/Vite chính vẫn chạy từ `frontend/`.

Ảnh public `/uploads/` cho phép nhúng khác origin; ảnh có URL `localhost` được
mobile chuyển sang origin API đã cấu hình. API vẫn giữ xác thực, phân quyền và
allowlist CORS hiện có.

## Tạo APK / bản iOS để cài đặt

`eas.json` có profile `preview` tạo APK Android và `production` dành cho store.
Xác nhận hoặc đổi identifier `com.tourgo.travel` trong `app.json` theo tài khoản
phát hành của đơn vị trước khi đưa lên cửa hàng.

```powershell
cd mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest build --platform android --profile preview
```

EAS cần tài khoản Expo và liên kết project. Nếu EAS yêu cầu cập nhật dynamic
config, thêm `extra.eas.projectId` mà EAS cung cấp vào `app.json`, dùng đúng UUID
do tài khoản của bạn tạo.

Build production cần `EXPO_PUBLIC_API_URL` trỏ tới backend HTTPS trong môi trường
EAS; config từ chối production nếu URL thiếu hoặc dùng HTTP. Android chỉ bật
cleartext khi cấu hình API HTTP cho phát triển/LAN. Bản iOS cài thật hoặc phát hành
cần thông tin ký ứng dụng tương ứng; xem [hướng dẫn build Expo](https://docs.expo.dev/build/introduction/).

Export JavaScript/Hermes cho Android/iOS không tạo APK/IPA có chữ ký. Cần bước EAS
hoặc môi trường Android/Xcode để tạo binary cài đặt.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo-doctor
npm.cmd run export:check
```

`export:check` bundle Android, iOS và web vào `mobile/dist` (không đưa lên Git).
Client được kiểm thử refresh đồng thời, logout trong lúc refresh, lỗi mạng,
form-data chứng từ và ngăn gửi bearer token sang URL ngoài.

Kết quả kiểm tra giao diện và luồng nghiệp vụ ngày 09/11/2026 được ghi tại
[docs/MOBILE_TESTING.md](../docs/MOBILE_TESTING.md), phân biệt rõ bản xem trước
trình duyệt, export native và các bước còn cần kiểm tra trên iPhone thật.

Trong `backend`, chạy `npm.cmd run test:checkout` để kiểm tra API trên database
MySQL thử nghiệm riêng, gồm đăng ký → đăng nhập → refresh → đặt tour → thanh toán
→ hóa đơn. Email trong bộ test dùng transport giả lập.

## Cấu trúc

```text
src/app/                 Điều hướng và màn hình bằng Expo Router
src/components/          UI, thẻ tour, chọn ngày sinh
src/context/session.tsx  Khôi phục phiên, đăng nhập/đăng xuất, hồ sơ
src/hooks/               Request có hủy và refresh khi quay lại màn hình
src/lib/                 API client, kiểu dữ liệu, định dạng, in/chia sẻ hóa đơn
tests/                   Kiểm thử client không cần giả lập điện thoại
```

Tham khảo: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
[Print](https://docs.expo.dev/versions/v57.0.0/sdk/print/),
[Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
