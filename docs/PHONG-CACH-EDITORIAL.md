# Phong cách giao diện "Editorial" (tham chiếu jacadatravel.com) — TourGo

Tài liệu bàn giao để mở cửa sổ chat mới. Phạm vi: **khu khách hàng** của `frontend/` (React + Vite, CSS thuần, không Tailwind). Khu **admin / staff không đụng tới**.

## 1. Tình trạng các trang

Ghi chú: "đã viết CSS" nghĩa là đã có CSS editorial và `npm run build` qua. **Chưa kiểm tra bằng mắt trên trình duyệt, chưa chạy `npm test`, chưa chạy `scripts/verify-travel-ui.mjs`** (người dùng đã từ chối chạy `npm test` một lần).

| Route | Component | Trạng thái | File CSS chính |
|---|---|---|---|
| `#/` | `pages/Home.jsx` | Đã viết lại JSX + CSS | `home.css` |
| `#/tours` | `pages/Tours.jsx` | Đã viết CSS (JSX giữ nguyên) | `explore.css` |
| `#/tours/:id` | `pages/TourDetail.jsx` | Đã viết CSS | `editorial.css` (mục "Chi tiết tour") |
| `#/login` | `pages/Login.jsx` → `components/CustomerLogin.jsx` | Đã viết CSS | `editorial-login.css` |
| `#/booking/:id` | `pages/Booking.jsx` | Đã viết CSS | `editorial-checkout.css` |
| `#/payment/:id` | `pages/Payment.jsx` | Đã viết CSS | `editorial-checkout.css` |
| Đặt chỗ thành công | `components/BookingSuccess.jsx` | Đã viết CSS | `editorial-checkout.css` |
| `#/account/overview` | `pages/AccountOverview.jsx` | Đã viết CSS | `editorial-account.css` |
| `#/bookings` | `pages/MyBookings.jsx` | Đã viết CSS | `editorial-account.css` |
| `#/bookings/:id` | `pages/BookingDetail.jsx` | Đã viết CSS | `editorial-account.css` |
| `#/account/vouchers` | `pages/MyVouchers.jsx` | Đã viết CSS | `editorial-account.css` |
| `#/notifications` | `pages/Notifications.jsx` | Đã viết CSS | `editorial-account.css` |
| `#/favorites` | `pages/Favorites.jsx` | Đã viết CSS (page-banner, lưới 2 cột, `TourCard` trong `.account-main`) | `editorial-pages.css` |
| `#/account`, `#/account/security` | `pages/Account.jsx` | Đã viết CSS | `editorial-pages.css` |
| `#/support` | `pages/Support.jsx` | Đã viết CSS (record-card, toolbar, thread, dialog) | `editorial-pages.css` |
| `#/reviews` + `TourReviews` | `pages/Reviews.jsx` | Đã viết CSS (record-card, blockquote) | `editorial-pages.css` |
| `#/forgot-password`, `#/reset-password` | `pages/PasswordRecovery.jsx` | Đã viết CSS (`.recovery-panel`) | `editorial-pages.css` |
| Dùng chung | `ActionForm`, `ActionDialog`, `Pagination`, `State`, `.notice.error` | Đã viết CSS | `editorial-pages.css` |
| Header + Footer | `components/Navbar.jsx`, `Footer.jsx` | Đã viết CSS (toàn khu khách) | `editorial.css` |

### Còn cần làm / cần kiểm tra
Toàn bộ trang khách đã có CSS editorial (`npm run build` qua). Chưa kiểm tra bằng mắt, chưa chạy `npm test`. Việc còn lại:
- Mở từng route ở desktop + 390px + 320px, xem có tràn ngang hoặc lệch bố cục không (đặc biệt Booking, Payment, Account, Support, Favorites).
- `Banners.jsx` chỉ được style trong Home (`home.css`); `PublicPromotions.jsx` chỉ dùng ở Home; `PromotionPicker.jsx` đã style trong `editorial-checkout.css`.
- Chưa rà: `.workspace-nav`, `.workspace-form`, `.stat-grid` nếu xuất hiện trong khu tài khoản.

## 2. Hệ thiết kế (design tokens)

| Token | Giá trị |
|---|---|
| Mực (chữ chính, nút chính) | `#211d18` |
| Chữ phụ | `#6f675c` |
| Nền kem | `#fbf8f3` |
| Sand (khối nền phụ) | `#efe8dc` |
| Đường kẻ | `#e3dccf` |
| Accent nâu đất | `#a9693f` (hover/đậm: `#8c5430`) |
| Vàng nhạt trên ảnh tối | `#f0d9b5` |
| Font tiêu đề, giá, logo | `'Cormorant Garamond', Georgia, serif` |
| Font nội dung | `'Jost', 'Segoe UI', Arial, sans-serif` |

Hai font nạp qua Google Fonts trong `frontend/index.html`.

### Quy tắc phong cách
- Góc **vuông** (radius 0–2px). Không bo tròn lớn, không bóng đổ nặng, không gradient màu.
- Tiêu đề h1/h2/h3 dùng serif, weight 400–500, `letter-spacing` âm nhẹ; h1 rất lớn (`clamp` tới ~64–92px).
- Nhãn nhỏ (eyebrow, legend, tab, nút): chữ **in hoa**, `letter-spacing` .12–.26em, cỡ 11–12px.
- Giá tiền và số lớn dùng serif.
- Nút chính: nền mực đen, chữ trắng, in hoa; hover đổi sang accent `#a9693f`. Nút phụ: viền mực, nền trong suốt; hover đổ mực.
- Link nhỏ: gạch chân (`text-underline-offset: 4px`) thay cho nút đặc.
- Input: viền `#e3dccf`, nền trắng; focus đổi viền accent và gạch dưới accent (`box-shadow: inset 0 -2px 0`).
- Trạng thái: pending `#f3e4c6`/`#8c5430`, thành công `#dfe8d6`/`#4b6a38`, lỗi `#f1d9d3`/`#9a4a3b`; huy hiệu vuông, in hoa.
- Header: nền kem, viền dưới mảnh, logo serif, nav in hoa, link active màu accent. Riêng Home: header trong suốt đè lên hero ở ≥851px.
- Footer: nền mực `#211d18`, nút trắng in hoa.
- Hero/banner: ảnh full-bleed với lớp gradient tối (`ha-long.jpg` ở Khám phá, Đăng nhập).
- Thẻ tour: ảnh tỉ lệ 4/5, tiêu đề + giá serif, lưới 3 cột.

## 3. Cấu trúc file CSS và thứ tự nạp

Thứ tự import trong `frontend/src/main.jsx` (sau nạp ghi đè trước):
`styles` → `animations` → `depth` → `workspace` → `travel` (nền xanh lá cũ) → `tourgo` (nền xanh dương cũ) → **`editorial`** → `login` → `home` → `explore` → `checkout` → `payment` → `booking-success` → `staff` → `admin` → `records` → **`editorial-login` → `editorial-checkout` → `editorial-account` → `editorial-pages`**.

Các file `editorial-*` nạp sau cùng nên ghi đè được `login.css`, `checkout.css`, `payment.css`, `booking-success.css`, `records.css`, `tourgo.css`. CSS cũ vẫn còn trong repo; chưa xoá để tránh vỡ.

Phạm vi selector:
- `editorial.css`: `.customer-site …` (cả khu khách; thêm token `--ed-*` trên `.customer-site`).
- `home.css`: `.tourgo-home`, header Home qua `.customer-site:has(.tourgo-home)`; token `--home-*`.
- `explore.css`: `.tour-explorer`, header/footer qua `.customer-site:has(.tour-explorer)`; token `--ex-*`.
- `editorial-login.css`: các class `.login-*`, `.destination-login`.
- `editorial-checkout.css`: `.checkout-*`, `.promotion-*`, `.payment-*`, `.success-*`, `.booking-success-page`.
- `editorial-account.css`: `.customer-account-site …` (khu có `AccountLayout`).
- `editorial-pages.css`: thành phần dùng chung `.customer-site` (`.action-form`, `.record-dialog`, `.pagination`, `.notice.error`, `blockquote`, `.recovery-panel`) và các trang còn lại trong `.customer-account-site` (Account, Support, Reviews, Favorites).

## 4. Ràng buộc kỹ thuật cần giữ

- Đã đổi `frontend/scripts/verify-travel-ui.mjs` dòng 69: `.home-hero h1 em` phải có `font-style: italic`.
- `verify-travel-ui.mjs` kiểm tra các selector phải còn tồn tại: `.destination-card` (6), `.home-benefits > div` (5), `.search-panel`, `.listing-layout`, `.explore-filters`, `.explore-active`, `.results-heading select`, `.explore-empty-reset`, `.detail-cover`, `.menu-toggle`, `.explore-filter-toggle`; không tràn ngang ở 390px và 320px; `.explore-filters` ẩn ở mobile.
- `frontend/tests/images.test.js` kiểm tra `styles.css` còn URL `ninh-binh.jpg`, `sa-pa.jpg` và `Login.jsx` còn `src="/images/hoi-an.jpg"`. Không sửa các chỗ này.
- Hiệu ứng JS toàn cục: `motion.js` (reveal `.tour-card`/`.section-heading`), `tilt.js` (`.tour-card`/`.hero`).
- Không sửa khu admin/staff (`staff.css`, `admin.css`, `WorkspaceLayout`, `StaffLayout`).

## 5. Cách xem và kiểm tra

```
cd frontend
npm run dev      # mở http://localhost:5173/#/...
npm run build    # đã chạy thành công
```

Các route để xem: `#/`, `#/tours`, `#/tours/<id>`, `#/login`, `#/account/overview`, `#/bookings`, `#/bookings/<id>`, `#/account/vouchers`, `#/notifications`, `#/favorites`, `#/booking/<tourId>`, `#/payment/<bookingId>`.

## 6. Gợi ý prompt cho chat mới

> Đọc `docs/PHONG-CACH-EDITORIAL.md`. Tiếp tục áp dụng phong cách editorial cho các trang còn lại ở mục "Còn cần làm / cần kiểm tra" (Account, Support, Reviews, PasswordRecovery, TourReviews). Chỉ thêm/sửa CSS trong file `editorial-*.css`, không sửa khu admin/staff, chạy `npm run build` sau mỗi nhóm trang và không chạy `npm test` nếu chưa được phép.
