# Hệ thống quản lý tour du lịch

Backend NestJS, frontend React/Vite và MySQL. Chạy các lệnh dưới đây từ thư mục dự án.
Chức năng mã giảm giá, in hóa đơn và email thanh toán: [hướng dẫn cấu hình và sử dụng](docs/PAYMENT_RECEIPTS.md).
Trên Windows PowerShell, dùng `npm.cmd` nếu `npm` bị chặn bởi execution policy.

## Cài đặt và khởi tạo lần đầu

Cần Node.js 22.12+ (hoặc 24+) và MySQL đang chạy.

```powershell
cd backend
npm.cmd install
# Chỉ sao chép nếu chưa có .env; sau đó điền thông tin MySQL và JWT.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Tạo database `tour_management` trong MySQL nếu chưa có, dùng charset `utf8mb4`.
`database/database.sql` hiện trống; khởi tạo bảng bằng entity:

```powershell
npm.cmd run db:check
npm.cmd run db:sync
npm.cmd run db:seed
npm.cmd run db:seed:tours
npm.cmd run db:seed:images
```

`db:sync` chỉ chạy khi database chưa có bảng. Nếu database đã có dữ liệu, dùng migration để cập nhật schema.
Cờ `--force` xóa toàn bộ bảng và dữ liệu, chỉ dùng khi chủ động muốn dựng lại database.
Các script database build vào `backend/dist-scripts`, tách khỏi bản build server trong `backend/dist`.

## Chạy project

Terminal backend:

```powershell
cd backend
npm.cmd run dev
```

Terminal frontend:

```powershell
cd frontend
npm.cmd install
# Tùy chọn: sao chép .env.example sang .env nếu cần đổi địa chỉ API.
npm.cmd run dev
```

- Giao diện: http://localhost:5173
- API: http://localhost:3000/api
- Trạng thái: http://localhost:3000/api/health
- Swagger: http://localhost:3000/api/docs

Nếu đổi cổng backend, đặt `API_PROXY_TARGET` trong `frontend/.env` tương ứng.
Tài khoản admin mặc định sau seed: `admin@tour.local` / `Admin@123456` (có thể đổi bằng `ADMIN_EMAIL`, `ADMIN_PASSWORD` trước khi seed).

## Kiểm tra

Trong `backend`: `npm.cmd run build`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run test:e2e`.
E2e cần database đã được khởi tạo và kiểm tra các API công khai, xác thực và validation.

Trong `frontend`: `npm.cmd run build`, `npm.cmd test`.

Không sửa trực tiếp `backend/dist`: đây là mã sinh ra từ `backend/src` khi build.
