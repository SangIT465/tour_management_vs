# Kế hoạch phát triển Mã giảm giá (Promotion / Voucher)

Tài liệu này là kế hoạch triển khai tiếp theo cho module mã giảm giá của TourGo.
Nó gồm: (1) hiện trạng đã có, (2) khoảng trống cần bù, (3) kiến trúc đích,
(4) lộ trình 6 giai đoạn kèm danh sách việc và file cần sửa, (5) tiêu chí nghiệm thu,
(6) rủi ro và những gì **không** làm trong đợt này.

> **Trạng thái: đã triển khai phần lõi (GĐ0, GĐ1, GĐ2, GĐ3, GĐ5.3).**
> Xem [§8 Trạng thái triển khai](#8-trạng-thái-triển-khai) để biết việc nào đã xong,
> việc nào còn lại. Các bảng dưới đây giữ nguyên như bản kế hoạch gốc để đối chiếu.

---

## 1. Hiện trạng (đã có, đang chạy)

### 1.1 Mô hình dữ liệu

Bảng `promotions` – một bảng duy nhất, không có bảng con:

| Cột | Ý nghĩa |
|---|---|
| `code` | Mã, unique, luôn IN HOA |
| `type` | `PERCENT` \| `FIXED` |
| `value` | % hoặc số tiền |
| `max_discount` | Trần giảm khi `PERCENT` |
| `min_order` | Đơn tối thiểu |
| `usage_limit` / `used_count` | Tổng lượt / đã dùng (counter) |
| `per_user_limit` | Lượt mỗi khách |
| `valid_from` / `valid_to` | Hiệu lực |
| `active` | Bật/tắt |

Xem [`promotion.entity.ts`](../backend/src/modules/promotion/entities/promotion.entity.ts:19).
Index hiện có: `uq_promotions_code`, `idx_promotions_validity`,
`idx_bookings_promotion_customer` (trên `bookings`).

### 1.2 Nghiệp vụ đã chạy được

- Áp thử mã không trừ lượt: [`promotion.service.ts`](../backend/src/modules/promotion/promotion.service.ts:109).
- Kiểm tra đầy đủ điều kiện (tắt, hết lượt, chưa/hết hiệu lực, đơn tối thiểu, lượt/khách):
  [`findUsableOrFail()`](../backend/src/modules/promotion/promotion.service.ts:227).
- Giữ lượt nguyên tử bằng `UPDATE ... WHERE used_count < usage_limit`:
  [`reserveForBooking()`](../backend/src/modules/promotion/promotion.service.ts:273).
- Hoàn lượt khi hủy / từ chối / hết hạn: [`releaseForBooking()`](../backend/src/modules/promotion/promotion.service.ts:289),
  gọi từ [`releasePromotion()`](../backend/src/modules/booking/booking.service.ts:790).
- Khóa bi quan khi admin sửa mã để `usedCount` không bị ghi đè bởi dữ liệu cũ:
  [`withLockedPromotion()`](../backend/src/modules/promotion/promotion.service.ts:301).
- Chặn xóa mã đã gắn với đơn: [`remove()`](../backend/src/modules/promotion/promotion.service.ts:208).
- Tích hợp báo giá và tạo đơn: [`quote()`](../backend/src/modules/booking/booking.service.ts:198),
  [`create()`](../backend/src/modules/booking/booking.service.ts:240) – tiền luôn tính lại ở server.
- Hóa đơn và email hiển thị dòng giảm giá:
  [`invoice.template.ts`](../backend/src/modules/booking/templates/invoice.template.ts:148).
- API: `GET /promotions/available`, `POST /promotions/validate`, CRUD + `PATCH /:id/active`
  ([`promotion.controller.ts`](../backend/src/modules/promotion/promotion.controller.ts:39)).
- Quyền `promotion:manage` ([`auth.constants.ts`](../backend/src/common/auth/auth.constants.ts:35)).
- Giao diện: [`PromotionPicker.jsx`](../frontend/src/components/PromotionPicker.jsx:9),
  form CRUD generic trong [`management.js`](../frontend/src/management.js:10),
  mobile [`promotion-picker.tsx`](../mobile/src/components/promotion-picker.tsx:8).
- Dữ liệu mẫu 10 mã: [`promotion-catalog.ts`](../backend/scripts/lib/promotion-catalog.ts:5).

### 1.3 Kết luận hiện trạng

Luồng "một mã cho một đơn" đã **hoàn chỉnh và an toàn về tính nhất quán**.
Phần thiếu chủ yếu là **khả năng đo lường, phạm vi áp dụng, mã cá nhân hóa và trải nghiệm chọn mã**.

---

## 2. Khoảng trống cần bù

| # | Khoảng trống | Hệ quả hiện tại |
|---|---|---|
| G1 | Không có bảng lịch sử sử dụng (`promotion_redemptions`) | Không audit được ai dùng mã nào, giảm bao nhiêu; `used_count` là counter có thể lệch, không có nguồn đối chiếu |
| G2 | `per_user_limit` đếm bằng `COUNT(bookings)` | Không tách được "đã dùng" vs "đang giữ chỗ"; không hoàn mã chính xác theo từng đơn |
| G3 | Mã áp toàn hệ thống | Không chạy được campaign theo tour / danh mục / điểm đến / lịch khởi hành |
| G4 | Không có mã riêng cho từng khách | Không làm được voucher tặng, invite code, mã bù sự cố |
| G5 | Chỉ 1 mã/đơn, không có nhóm loại trừ | Không triển khai được "giảm tour + freeship" hoặc chặn cộng dồn |
| G6 | Không có ngân sách chiến dịch | Chỉ chặn theo số lượt, không chặn theo tổng tiền giảm |
| G7 | Không có trạng thái chiến dịch | Chỉ có `active` boolean; không phân biệt nháp / đã lên lịch / tạm dừng / kết thúc |
| G8 | Không có thống kê hiệu quả mã | Admin không biết mã nào hiệu quả, doanh thu ảnh hưởng bao nhiêu |
| G9 | Không ghi audit log cho CRUD mã | `AuditLogService` có sẵn nhưng promotion không gọi `write()` |
| G10 | Khách phải tự đoán mã tốt nhất | `available()` trả tối đa 50 mã, sắp theo `validTo`, không theo mức giảm thực tế |
| G11 | Không có API công khai | Khách chưa đăng nhập không xem được ưu đãi |
| G12 | Không có giới hạn theo kênh / hạng khách / đơn đầu tiên | Không chạy được ưu đãi riêng cho online, cho khách mới |
| G13 | Không có chống lạm dụng | `POST /promotions/validate` không rate limit; có thể dò mã |
| G14 | Bảng `promotions` không có migration | Đang phụ thuộc `synchronize`/seed – rủi ro khi triển khai production |
| G15 | Chưa có test tích hợp cho luồng mã | Chỉ có unit test service và entity |

---

## 3. Kiến trúc đích

### 3.1 Bảng dữ liệu

```
promotions (mở rộng)
  + name, description, image_url          -- nội dung hiển thị cho khách
  + status ENUM(DRAFT, SCHEDULED, ACTIVE, PAUSED, EXPIRED)
  + kind ENUM(PUBLIC, PERSONAL, GIFT)
  + budget_cap, budget_used               -- trần tổng tiền giảm
  + daily_limit, daily_used, daily_date   -- trần lượt/ngày
  + channel_scope ENUM(ALL, ONLINE, COUNTER)
  + customer_scope ENUM(ALL, NEW_CUSTOMER, TIER)
  + stackable, exclusive_group, priority
  + terms_text

promotion_scopes        (mã áp cho phạm vi nào)
  promotion_id, scope_type ENUM(TOUR, CATEGORY, DESTINATION, SCHEDULE), scope_id

promotion_assignments   (mã cấp riêng cho khách)
  promotion_id, customer_id, assigned_at, used_at, booking_id

promotion_redemptions   (sổ cái – nguồn sự thật)
  id, promotion_id, booking_id, customer_id,
  discount_amount, subtotal_at_use, status ENUM(RESERVED, CONFIRMED, RELEASED),
  reserved_at, confirmed_at, released_at, release_reason

booking_discounts       (một đơn có thể nhiều dòng giảm)
  booking_id, promotion_id, code_snapshot, type_snapshot,
  value_snapshot, discount_amount, exclusive_group
```

`bookings.discount` và `bookings.total` **giữ nguyên** để không phá hóa đơn cũ;
`booking_discounts` là chi tiết, `bookings.discount` là tổng.

### 3.2 Tách engine tính giảm giá

Hiện `calculateDiscount()` nằm trong entity và chỉ biết `subtotal`.
Đích: một `DiscountEngine` thuần (không phụ thuộc TypeORM) nhận **context**:

```ts
interface DiscountContext {
  subtotal: number;
  lines: { type: PassengerType; quantity: number; amount: number }[];
  tourId: string; categoryIds: string[]; destinationIds: string[]; scheduleId: string;
  customerId: string; isFirstBooking: boolean; tier: string | null;
  channel: 'ONLINE' | 'COUNTER'; paymentMethod: string | null;
  now: Date;
}
```

Trả về:

```ts
interface DiscountEvaluation {
  applied: AppliedDiscount[];      // đã chọn, đã xếp hạng
  rejected: { code: string; reason: string }[];  // để FE hiển thị lý do
  totalDiscount: number;
}
```

Nhờ vậy: cùng một logic dùng cho `quote`, `create`, `validate`, `best-offer`, và test thuần.

### 3.3 Nguyên tắc giữ nguyên

- Tiền vẫn **chỉ** tính ở server; client không gửi số tiền.
- `reserve`/`release` vẫn đi qua transaction của booking.
- Mã đã gắn đơn thì không xóa cứng.
- Hóa đơn cũ render từ `snapshot`, không đọc lại bảng `promotions`.

---

## 4. Lộ trình triển khai

### Giai đoạn 0 — Nền tảng dữ liệu & an toàn (ưu tiên cao nhất) — ✅ đã xong

Mục tiêu: có migration thật, có sổ cái, đối chiếu được `used_count`.

| Việc | File / vị trí |
|---|---|
| 0.1 Viết migration tạo `promotions` + index (thay phụ thuộc `synchronize`) | `backend/src/database/migrations/<ts>-Promotions.ts` |
| 0.2 Tạo bảng `promotion_redemptions` + index `(promotion_id, status)`, `(customer_id)` | migration trên |
| 0.3 Backfill redemption từ `bookings` hiện có (status ≠ CANCELLED/REJECTED/EXPIRED) | script `backend/scripts/backfill-promotion-redemptions.ts` |
| 0.4 Ghi redemption `RESERVED` trong `create()`, `CONFIRMED` khi thanh toán xong, `RELEASED` khi hủy/hết hạn | `booking.service.ts`, `payment.service.ts` |
| 0.5 Đổi `per_user_limit` sang đếm trên `promotion_redemptions` thay vì `COUNT(bookings)` | `promotion.service.ts:251` |
| 0.6 Job đối chiếu: so `used_count` với số redemption `RESERVED+CONFIRMED`, log lệch | `maintenance.service.ts` |
| 0.7 Gọi `AuditLogService.write()` cho create/update/setActive/remove | `promotion.service.ts` |

**Nghiệm thu GĐ0:** chạy migration trên DB có dữ liệu sẵn không mất đơn cũ;
`used_count` khớp sổ cái; hủy đơn → redemption `RELEASED` và `used_count` giảm đúng 1.

---

### Giai đoạn 1 — Mở rộng mô hình mã — ✅ đã xong

Mục tiêu: mã có nội dung hiển thị, trạng thái rõ ràng, phạm vi áp dụng, mã cá nhân.

| Việc | File / vị trí |
|---|---|
| 1.1 Thêm cột mới vào entity (name, description, imageUrl, status, kind, budgetCap/Used, dailyLimit/Used/Date, channelScope, customerScope, stackable, exclusiveGroup, priority, termsText) | `promotion.entity.ts` |
| 1.2 Enum mới `PromotionStatus`, `PromotionKind`, `PromotionScopeType`, `PromotionChannelScope`, `PromotionCustomerScope` | `common/enums/index.ts` |
| 1.3 Entity `PromotionScope`, `PromotionAssignment`, `PromotionRedemption`, `BookingDiscount` + đăng ký vào `all-entities.array.ts` | `modules/promotion/entities/*` |
| 1.4 DTO: thêm trường mới, validate chéo (`budgetCap ≥ 0`, `dailyLimit ≥ 1`, `exclusiveGroup` bắt buộc khi `stackable = false`) | `dto/promotion.dto.ts` |
| 1.5 Service: CRUD scope (gán tour/danh mục/điểm đến/lịch), CRUD assignment (cấp mã cho khách) | `promotion.service.ts` |
| 1.6 API: `PUT /promotions/:id/scopes`, `POST /promotions/:id/assignments`, `GET /promotions/my-vouchers` | `promotion.controller.ts` |
| 1.7 `toView()` trả thêm trường mới + `status` suy ra từ thời gian nếu cần | `promotion.service.ts:351` |
| 1.8 Cập nhật form admin generic + nhãn cột | `frontend/src/management.js:10` |

**Nghiệm thu GĐ1:** tạo được mã giới hạn theo 1 tour; cấp mã riêng cho 1 khách;
mã `DRAFT` không xuất hiện trong `available`; migration chạy lại idempotent.

---

### Giai đoạn 2 — Engine tính giảm giá & cộng dồn có kiểm soát — ✅ đã xong

Mục tiêu: một nơi duy nhất quyết định giảm bao nhiêu, hỗ trợ nhiều dòng giảm.

| Việc | File / vị trí |
|---|---|
| 2.1 Tạo `DiscountEngine` thuần + type `DiscountContext`, `DiscountEvaluation` | `modules/promotion/services/discount-engine.ts` |
| 2.2 Chuyển logic `calculateDiscount`/`isUsable` sang engine, entity chỉ còn dữ liệu | `promotion.entity.ts` |
| 2.3 Kiểm tra phạm vi (scope), kênh, hạng khách, đơn đầu tiên, ngân sách, trần ngày | engine |
| 2.4 Chọn tổ hợp mã: lọc theo `exclusiveGroup`, sắp theo `priority` rồi theo mức giảm thực tế, giới hạn số mã | engine |
| 2.5 `quote()` và `create()` dùng engine; ghi `booking_discounts` + `bookings.discount` = tổng | `booking.service.ts:198`, `:240` |
| 2.6 `reserveForBooking` cập nhật cả `used_count`, `budget_used`, `daily_used` trong 1 câu UPDATE có điều kiện | `promotion.service.ts:273` |
| 2.7 `releaseForBooking` hoàn đúng các counter tương ứng | `promotion.service.ts:289` |
| 2.8 Hóa đơn/email đọc `booking_discounts` để in nhiều dòng giảm | `invoice.service.ts`, `invoice.template.ts`, `booking-mail.template.ts` |
| 2.9 Test bảng: PERCENT có trần, FIXED vượt subtotal, cộng dồn 2 mã, loại trừ nhóm, vượt ngân sách | `discount-engine.spec.ts` |

**Nghiệm thu GĐ2:** đơn có 2 mã không cùng nhóm loại trừ → giảm đúng tổng;
vượt `budget_cap` → mã bị từ chối kèm lý do; hóa đơn in đủ từng dòng giảm.

---

### Giai đoạn 3 — Trải nghiệm khách hàng — ✅ đã xong (web; mobile còn lại)

| Việc | File / vị trí |
|---|---|
| 3.1 `GET /promotions/public` (không cần auth) trả mã `PUBLIC` còn hiệu lực | `promotion.controller.ts` |
| 3.2 `POST /promotions/best-for-cart` trả mã tốt nhất + tiết kiệm thêm | `promotion.service.ts` |
| 3.3 `available()` sắp theo mức giảm thực tế trên subtotal hiện tại, trả kèm `estimatedDiscount` | `promotion.service.ts:39` |
| 3.4 FE: badge "Tiết kiệm thêm X", nút "Dùng mã tốt nhất", đếm ngược hạn, lý do không dùng được | `PromotionPicker.jsx`, `Booking.jsx` |
| 3.5 Trang "Ưu đãi của tôi" (mã được cấp riêng + mã công khai) | `frontend/src/pages/` |
| 3.6 Mobile: đồng bộ picker + màn ưu đãi | `mobile/src/components/promotion-picker.tsx`, `mobile/src/app/` |
| 3.7 CSS cho voucher (trạng thái: dùng được / thiếu điều kiện / hết hạn) | `frontend/src/checkout.css` |

**Nghiệm thu GĐ3:** khách thấy đúng số tiền tiết kiệm trước khi bấm đặt;
mã không đủ điều kiện hiển thị lý do thay vì ẩn im lặng.

---

### Giai đoạn 4 — Quản trị & báo cáo — 🟡 một phần (4.1 xong)

| Việc | File / vị trí |
|---|---|
| 4.1 `GET /promotions/:id/stats`: lượt dùng, tổng giảm, doanh thu mang lại, tỉ lệ dùng, top khách | `promotion.service.ts` |
| 4.2 `GET /promotions/report?from&to&groupBy`: so sánh các mã | `promotion.controller.ts` |
| 4.3 Bổ sung khối "Giảm giá" vào báo cáo doanh thu (không trộn với thu ròng) | `system/report.controller.ts:27` |
| 4.4 Màn admin chi tiết mã: thông tin, phạm vi, timeline redemption, biểu đồ | `frontend/src/pages/AdminDashboard.jsx` |
| 4.5 Xuất CSV thống kê mã (dùng `csvCell` chống công thức) | `frontend/src/management.js:22` |
| 4.6 Thông báo in-app + email khi mã sắp hết hạn / hết lượt | `notification.service.ts`, `mail-outbox.service.ts` |

**Nghiệm thu GĐ4:** admin trả lời được "mã nào hiệu quả nhất tháng này" bằng số liệu,
không cần truy vấn DB thủ công.

---

### Giai đoạn 5 — Chống lạm dụng & vận hành — 🟡 một phần (5.3 xong)

| Việc | File / vị trí |
|---|---|
| 5.1 Rate limit `POST /promotions/validate` theo user/IP (chống dò mã) | `promotion.controller.ts` + guard |
| 5.2 Chặn một khách giữ nhiều đơn `PENDING_PAYMENT` cùng một mã vượt `per_user_limit` | `promotion.service.ts:251` |
| 5.3 Job chuyển mã hết hạn sang `EXPIRED`, đóng `SCHEDULED` khi tới giờ | `maintenance.service.ts` |
| 5.4 Test tích hợp: đặt → thanh toán → hủy → hoàn mã; hai request đồng thời tranh lượt cuối | `backend/test/promotion.integration.ts` |
| 5.5 Tài liệu API + hướng dẫn vận hành chiến dịch | `docs/` |

**Nghiệm thu GĐ5:** 2 request đồng thời dùng lượt cuối → đúng 1 thành công;
dò 100 mã sai trong 1 phút bị chặn.

---

## 5. Thứ tự ưu tiên (MoSCoW)

| Mức | Hạng mục |
|---|---|
| **Must** | GĐ0 (migration, redemption ledger, audit log), GĐ1 phần `status`/`scope`/`assignment`, GĐ2 engine |
| **Should** | GĐ3 (best-offer, ưu đãi của tôi), GĐ4.1–4.3 (thống kê) |
| **Could** | GĐ2 cộng dồn nhiều mã, GĐ4.4–4.6, GĐ5.1–5.3 |
| **Won't (đợt này)** | Mã theo bậc (tiered), mua X tặng Y, mã theo thiết bị/IP, tích hợp đối tác voucher bên thứ ba |

Ước lượng thô: GĐ0 ≈ 2 ngày, GĐ1 ≈ 4 ngày, GĐ2 ≈ 4 ngày, GĐ3 ≈ 3 ngày,
GĐ4 ≈ 3 ngày, GĐ5 ≈ 2 ngày. Tổng ≈ 18 ngày công, có thể chạy song song GĐ3 và GĐ4
sau khi GĐ2 xong.

---

## 6. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Migration làm hỏng dữ liệu đơn cũ | Chỉ `ADD COLUMN` nullable + backfill theo lô; không đổi kiểu cột tiền; chạy trên bản dump trước |
| `used_count` lệch sau khi thêm sổ cái | Job đối chiếu GĐ0.6 + log cảnh báo; sổ cái là nguồn sự thật, counter chỉ để đọc nhanh |
| Cộng dồn mã làm giảm quá sâu | `exclusiveGroup` + `budget_cap` + trần tổng giảm/đơn trong cấu hình hệ thống |
| Engine mới lệch kết quả so với `calculateDiscount` cũ | Giữ test đối chiếu: cùng input → cùng output với implementation cũ trước khi xóa |
| Hóa đơn cũ hiển thị sai | Hóa đơn render từ `snapshot`; không đọc lại `promotions`/`booking_discounts` |
| Khách thấy mã nhưng không dùng được | `available`/`best-for-cart` trả `rejectedReason` thay vì lọc im lặng |

---

## 7. Định nghĩa hoàn thành (Definition of Done)

Một hạng mục chỉ được coi là xong khi:

1. Có migration (nếu đổi schema) chạy được trên DB đang có dữ liệu.
2. Có unit test cho logic thuần và test tích hợp cho luồng có transaction.
3. `npm test` và `npm run db:build` ở `backend/` xanh; `npm test` và `npm run build` ở `frontend/` xanh.
4. Không thay đổi hành vi hóa đơn đã phát hành.
5. Cập nhật `docs/FEATURE-CHECKLIST.md` mục "Khuyến mãi" và tài liệu API liên quan.

---

## 8. Trạng thái triển khai

Cập nhật: 11/11/2026. Đợt này làm **phần lõi**: dữ liệu, engine, tích hợp đơn/thanh toán,
trải nghiệm web và job hết hạn. Phần báo cáo nâng cao và chống lạm dụng còn lại.

### 8.1 File đã tạo

| File | Nội dung |
|---|---|
| [`backend/src/database/migrations/1794186000000-PromotionCampaigns.ts`](../backend/src/database/migrations/1794186000000-PromotionCampaigns.ts) | Thêm cột vào `promotions` + tạo 4 bảng mới. Idempotent: `CREATE TABLE IF NOT EXISTS`, kiểm tra cột tồn tại trước khi `ADD COLUMN`. |
| [`backend/scripts/backfill-promotion-redemptions.ts`](../backend/scripts/backfill-promotion-redemptions.ts) | Sinh `promotion_redemptions` từ `bookings` cũ. Idempotent (`ON DUPLICATE KEY UPDATE`), có `--dry-run`. |
| [`backend/src/modules/promotion/entities/promotion-scope.entity.ts`](../backend/src/modules/promotion/entities/promotion-scope.entity.ts) | Phạm vi áp dụng (TOUR / CATEGORY / DESTINATION / SCHEDULE). |
| [`backend/src/modules/promotion/entities/promotion-assignment.entity.ts`](../backend/src/modules/promotion/entities/promotion-assignment.entity.ts) | Cấp mã riêng cho khách (`assigned_at`, `used_at`, `booking_id`). |
| [`backend/src/modules/promotion/entities/promotion-redemption.entity.ts`](../backend/src/modules/promotion/entities/promotion-redemption.entity.ts) | Sổ cái từng lượt dùng: `RESERVED → CONFIRMED` hoặc `→ RELEASED`. |
| [`backend/src/modules/promotion/entities/booking-discount.entity.ts`](../backend/src/modules/promotion/entities/booking-discount.entity.ts) | Chi tiết từng dòng giảm giá của một đơn (snapshot mã/loại/giá trị). |
| [`backend/src/modules/promotion/services/discount-engine.ts`](../backend/src/modules/promotion/services/discount-engine.ts) | Engine **thuần** (không TypeORM): `evaluatePromotion()` chấm 1 mã, `selectDiscounts()` chọn tổ hợp mã. |
| [`backend/src/modules/promotion/services/discount-engine.spec.ts`](../backend/src/modules/promotion/services/discount-engine.spec.ts) | 37 test: trần giảm, vượt subtotal, hạn mức cá nhân, kênh bán, khách mới, mã PERSONAL, 4 loại scope, cộng dồn, `exclusiveGroup`, trần tổng giảm, lý do từ chối. |

### 8.2 Đối chiếu lộ trình

| Việc | Trạng thái | Ghi chú |
|---|---|---|
| GĐ0.1 Migration `promotions` + index | ✅ | `1794186000000-PromotionCampaigns.ts` |
| GĐ0.2 Bảng `promotion_redemptions` + index | ✅ | `(promotion_id, status)`, `(customer_id)` |
| GĐ0.3 Backfill redemption từ `bookings` cũ | ✅ | Script riêng, có `--dry-run` |
| GĐ0.4 `RESERVED` / `CONFIRMED` / `RELEASED` | ✅ | `booking.service.ts` ghi RESERVED + RELEASED; `payment.service.ts` chốt CONFIRMED |
| GĐ0.5 `per_user_limit` đếm trên sổ cái | ⚠️ một phần | Vẫn đếm trên `bookings` (loại trừ trạng thái đã nhả) để giữ tương thích; sổ cái đã có sẵn để chuyển hẳn sau |
| GĐ0.6 Job đối chiếu `used_count` ↔ sổ cái | ❌ chưa làm | Cần thêm vào `maintenance.service.ts` |
| GĐ0.7 Audit log cho create/update/setActive/remove | ❌ chưa làm | `PromotionService` chưa gọi `AuditLogService` |
| GĐ1.1 Cột mới trong `promotion.entity.ts` | ✅ | `status`, `kind`, `budgetCap/Used`, `dailyLimit/Used/Date`, `channelScope`, `customerScope`, `stackable`, `exclusiveGroup`, `priority`, `termsText`, `name`, `description`, `imageUrl` |
| GĐ1.2 Enum mới | ✅ | `PromotionStatus`, `PromotionKind`, `PromotionScopeType`, `PromotionChannelScope`, `PromotionCustomerScope`, `PromotionRedemptionStatus` |
| GĐ1.3 4 entity mới + đăng ký | ✅ | `ALL_ENTITIES` 38 → 42; metadata 41 → 45 |
| GĐ1.4 DTO mới + validate chéo | ✅ | `CreatePromotionDto`, `QueryPromotionsDto`, `PromotionScopeDto`, `AssignPromotionDto`, `BestOfferDto`, `QueryRedemptionsDto` |
| GĐ1.5 CRUD scope + assignment | ✅ | `replaceScopes()`, `assignToCustomers()` |
| GĐ1.6 API scope/assignment/my-vouchers | ✅ | `PUT /promotions/:id/scopes`, `POST /promotions/:id/assignments`, `GET /promotions/my-vouchers` |
| GĐ1.7 `toView()` trả trường mới | ✅ | Kèm `scopes`, `remainingUses` |
| GĐ1.8 Form admin + nhãn cột | ✅ | `frontend/src/management.js` – 22 trường, thêm nhãn `kind`/`budgetUsed`/`budgetCap`/`priority` |
| GĐ2.1 `DiscountEngine` thuần | ✅ | `discount-engine.ts` |
| GĐ2.2 Entity chỉ còn dữ liệu | ⚠️ một phần | `calculateDiscount()`/`isUsable()` vẫn giữ trong entity để không phá test cũ; engine là nguồn sự thật khi có context |
| GĐ2.3 Scope/kênh/hạng khách/ngân sách/trần ngày | ✅ | Trong `evaluatePromotion()` |
| GĐ2.4 Chọn tổ hợp mã | ✅ | `selectDiscounts()`: `priority` → mức giảm thực tế, `exclusiveGroup`, `maxCodes`, trần tổng giảm |
| GĐ2.5 `quote()`/`create()` dùng engine | ✅ | `booking.service.ts` – `evaluateForBooking()` + `recordBookingDiscounts()` |
| GĐ2.6 `reserveForBooking` cập nhật 3 counter | ✅ | Một câu `UPDATE` có điều kiện; `affected = 0` → 409 |
| GĐ2.7 `releaseForBooking` hoàn counter | ✅ | `GREATEST(... - n, 0)` + đánh dấu `RELEASED` |
| GĐ2.8 Hóa đơn/email in nhiều dòng giảm | ⚠️ một phần | Hóa đơn/email vẫn in **một dòng tổng** từ `bookings.discount`; `booking_discounts` đã lưu chi tiết nhưng chưa render từng dòng |
| GĐ2.9 Test bảng cho engine | ✅ | `discount-engine.spec.ts` – 37 test |
| GĐ3.1 `GET /promotions/public` | ✅ | `@Public()`, chỉ mã `PUBLIC` còn hiệu lực |
| GĐ3.2 `POST /promotions/best-for-cart` | ✅ | Trả mã tốt nhất + tiết kiệm thêm |
| GĐ3.3 `available()` trả `estimatedDiscount` | ✅ | Chấm điểm khi có `subtotal` + `scheduleId` |
| GĐ3.4 FE badge tiết kiệm + lý do | ✅ | `PromotionPicker.jsx` + `promotionAvailablePath()`/`sortVouchers()` trong `utils.js` |
| GĐ3.5 Trang "Ưu đãi của tôi" | ❌ chưa làm | API `GET /promotions/my-vouchers` đã có, chưa có trang |
| GĐ3.6 Mobile picker | ❌ chưa làm | |
| GĐ3.7 CSS voucher | ✅ | `frontend/src/checkout.css` – `.promotion-voucher-name`, `.promotion-savings` |
| GĐ4.1 `GET /promotions/:id/stats` | ✅ | `stats()`: lượt dùng, tổng giảm, tỉ lệ giảm, khách duy nhất, lần dùng cuối |
| GĐ4.2 `GET /promotions/report` | ❌ chưa làm | |
| GĐ4.3 Khối "Giảm giá" trong báo cáo doanh thu | ❌ chưa làm | |
| GĐ4.4 Màn admin chi tiết mã | ❌ chưa làm | |
| GĐ4.5 Xuất CSV thống kê mã | ❌ chưa làm | |
| GĐ4.6 Thông báo mã sắp hết hạn | ❌ chưa làm | |
| GĐ5.1 Rate limit `POST /promotions/validate` | ❌ chưa làm | |
| GĐ5.2 Chặn giữ nhiều đơn cùng mã | ⚠️ một phần | `per_user_limit` đã tính cả đơn `PENDING_PAYMENT` (chỉ loại trừ trạng thái đã nhả) |
| GĐ5.3 Job chuyển mã hết hạn sang `EXPIRED` | ✅ | `MaintenanceService.expirePromotions()` – cron mỗi giờ |
| GĐ5.4 Test tích hợp luồng mã | ❌ chưa làm | |
| GĐ5.5 Tài liệu API + vận hành | ⚠️ một phần | Mục này + `FEATURE-CHECKLIST.md`; chưa có tài liệu API riêng |

### 8.3 Kết quả kiểm thử tại thời điểm triển khai

| Lệnh | Kết quả |
|---|---|
| `npx vitest run` (backend) | 172 pass / 3 fail – cả 3 fail nằm ở `mail-transport.service.spec.ts`, **lỗi có sẵn từ trước** (`getaddrinfo ENOTFOUND smtp.example.test`, mock `nodemailer` không áp dụng dưới Vitest 4), không liên quan mã giảm giá |
| `npx vitest run src/database/verify-entities.spec.ts` | 18/18 pass |
| `npx tsc -p tsconfig.json --noEmit` (backend) | Không lỗi |
| `npm test` (frontend) | 50/50 pass |
| `npm run build` (frontend) | Thành công |

### 8.4 Việc cần làm tiếp (theo thứ tự ưu tiên)

1. **GĐ0.6** Job đối chiếu `used_count` với sổ cái – phát hiện lệch trước khi báo cáo sai.
2. **GĐ0.7** Gọi `AuditLogService.write()` cho mọi thao tác admin trên mã.
3. **GĐ2.8** Render từng dòng giảm từ `booking_discounts` trên hóa đơn/email.
4. **GĐ5.1** Rate limit `POST /promotions/validate` để chống dò mã.
5. **GĐ3.5** Trang "Ưu đãi của tôi" dùng `GET /promotions/my-vouchers`.
6. **GĐ4.2–4.5** Báo cáo so sánh mã + xuất CSV.
7. **GĐ5.4** Test tích hợp: đặt → thanh toán → hủy → hoàn mã; hai request tranh lượt cuối.
