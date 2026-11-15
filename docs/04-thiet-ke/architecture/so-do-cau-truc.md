# Sơ đồ cấu trúc hệ thống — DoAnCNPM

> Tài liệu được tổng hợp từ knowledge graph do **graphify** trích xuất bằng AST trên toàn bộ mã nguồn
> (`backend/`, `frontend/`, `mobile/`, `docs/`, `database/`).
>
> **Số liệu graph:** 3.216 node · 9.657 cạnh · 140 community · 97% cạnh `EXTRACTED`, 3% `INFERRED`.
>
> File sinh tự động đi kèm:
> - [`callflow.html`](callflow.html) — 16 sơ đồ Mermaid + 15 bảng call-detail (mở bằng trình duyệt).
> - [`graphify-graph.html`](graphify-graph.html) — đồ thị tương tác, zoom/pan/lọc theo file.

---

## 1. Kiến trúc tổng thể (monorepo 3 tầng client)

```mermaid
flowchart TB
    subgraph CLIENT["Tầng trình bày"]
        WEB["Web SPA<br/>frontend/ · React + Vite<br/>hash router thủ công"]
        MOB["Mobile App<br/>mobile/ · Expo Router<br/>React Native"]
    end

    subgraph API["Tầng ứng dụng — NestJS (backend/src)"]
        MAIN["main.ts<br/>bootstrap()<br/>helmet · cookieParser · CORS · ValidationPipe"]
        GLOBAL["Global pipeline<br/>AllExceptionsFilter · TransformInterceptor"]
        GUARDS["Guard chain (APP_GUARD)<br/>ThrottlerGuard → JwtAuthGuard<br/>→ RolesGuard → PermissionsGuard"]
        APP["AppModule<br/>15 feature module"]
        SWAGGER["Swagger /api/docs"]
    end

    subgraph INFRA["Tầng hạ tầng"]
        TYPEORM["TypeORM forRootAsync<br/>autoLoadEntities + ALL_ENTITIES"]
        MYSQL[("MySQL<br/>database/database.sql")]
        UPLOAD[("UPLOAD_ROOT<br/>/uploads static")]
        MAIL[("SMTP<br/>MailTransportService")]
        EVENT["EventEmitterModule<br/>domain-events.ts"]
        CRON["NestScheduleModule<br/>MaintenanceService @Cron"]
    end

    WEB -->|"fetch /api/*<br/>Bearer + cookie"| MAIN
    MOB -->|"api-client.ts"| MAIN
    MAIN --> GUARDS --> APP
    MAIN --> GLOBAL
    MAIN --> SWAGGER
    APP --> TYPEORM --> MYSQL
    APP --> UPLOAD
    APP --> MAIL
    APP --> EVENT
    APP --> CRON
```

---

## 2. Sơ đồ phụ thuộc giữa các module backend

Trích từ `imports:` trong từng `*.module.ts` (16 module). Mũi tên = module bên trái `imports` module bên phải.

```mermaid
flowchart LR
    subgraph CORE["Hạ tầng dùng chung (không phụ thuộc feature)"]
        CFG["ConfigModule<br/>database.config · jwt.config"]
        USERS["UsersModule<br/>User · Role · Permission · AuthToken · GuideProfile"]
        UPLOADM["UploadModule<br/>UploadService"]
        MAILM["MailModule<br/>MailOutboxService"]
        NOTI["NotificationModule<br/>NotificationService"]
        SUPPORT["SupportModule<br/>SupportTicket"]
    end

    subgraph DOMAIN["Nghiệp vụ tour"]
        AUTH["AuthModule<br/>AuthService"]
        CATALOG["CatalogModule<br/>TourService · CategoryService · CancelPolicyService"]
        SCHED["ScheduleModule<br/>ScheduleService"]
        PROMO["PromotionModule<br/>PromotionService"]
        BOOKING["BookingModule<br/>BookingService · InvoiceService"]
        PAYMENT["PaymentModule<br/>PaymentService"]
        OPS["OperationsModule<br/>GuideAssignment · Attendance · Incident"]
        REVIEW["ReviewModule<br/>ReviewService"]
        SUPPLIER["SupplierModule<br/>SupplierService · ResourceAssignmentService"]
        SYSTEM["SystemModule<br/>AuditLog · Banner · EmailTemplate · SystemSetting"]
    end

    MAINT["MaintenanceModule<br/>@Cron dọn chỗ giữ / booking / giao dịch quá hạn"]

    AUTH --> USERS
    SCHED --> CATALOG
    BOOKING --> CATALOG
    BOOKING --> SCHED
    BOOKING --> PROMO
    PAYMENT --> BOOKING
    PAYMENT --> MAILM
    SYSTEM --> NOTI
    MAINT --> SCHED
    MAINT --> BOOKING
    MAINT --> PAYMENT

    APP["AppModule"] --> CFG
    APP --> USERS
    APP --> SUPPORT
    APP --> AUTH
    APP --> CATALOG
    APP --> SCHED
    APP --> PROMO
    APP --> BOOKING
    APP --> PAYMENT
    APP --> OPS
    APP --> REVIEW
    APP --> NOTI
    APP --> SUPPLIER
    APP --> SYSTEM
    APP --> UPLOADM
    APP --> MAINT
```

**Thứ tự nạp trong `AppModule.imports`** (có chủ đích, tránh vòng lặp):

```
Users → Support → Auth → Catalog → Schedule → Promotion → Booking
→ Payment → Operations → Review → Notification → Supplier → System
→ Upload → Maintenance
```

Quy ước phụ thuộc một chiều: **Catalog → Schedule → Booking → Payment**, trong khi
`Operations` chỉ **đọc** `schedule`/`booking` và `Maintenance` chỉ **gọi service** đã export.

---

## 3. Ánh xạ module → controller → service → entity

| Module | Controller (route prefix) | Service export | Nhóm entity chính |
|---|---|---|---|
| `auth` | `auth.controller.ts` → `auth` | `AuthService` | `AuthToken`, dùng lại `User`/`Role`/`Permission` |
| `users` | `users.controller.ts` → `users`<br/>`roles.controller.ts` → `roles` | `UsersService` + `TypeOrmModule` | `User`, `Role`, `Permission`, `AuthToken`, `GuideProfile` |
| `catalog` | `catalog.controller.ts` → `catalog`<br/>`tours.controller.ts` → `tours` | `TourService`, `CategoryService`, `CancelPolicyService` | `Tour`, `TourImage`, `TourDestination`, `ItineraryDay`, `Category`, `Destination`, `Favorite`, `CancelPolicy`, `CancelPolicyRule`, `DepartureSchedule` |
| `schedule` | `schedule.controller.ts` → `schedules` | `ScheduleService` | `DepartureSchedule`, `SeatHold`, `ScheduleCheckpoint` |
| `promotion` | `promotion.controller.ts` → `promotions` | `PromotionService` | `Promotion` |
| `booking` | `booking.controller.ts` → `bookings` | `BookingService`, `InvoiceService` | `Booking`, `Passenger`, `CancelRequest`, `Invoice`, `DepartureSchedule` |
| `payment` | `payment.controller.ts` → `payments` | `PaymentService` | `Payment`, `PaymentEvent`, `Refund`, `Booking`, `CancelRequest` |
| `operations` | `operations.controller.ts` → `operations`<br/>`attendance.controller.ts` → `operations/attendance`<br/>`guide-assignment.controller.ts` → `operations/assignments`<br/>`incident.controller.ts` → `operations/incidents` | `GuideAssignmentService`, `AttendanceService`, `IncidentService`, `OperationsService` | `GuideAssignment`, `Attendance`, `Incident`, `DepartureSchedule`, `ScheduleCheckpoint`, `Booking`, `Passenger`, `GuideProfile` |
| `review` | `review.controller.ts` → `reviews` | `ReviewService` | `Review`, `Booking`, `Tour`, `DepartureSchedule` |
| `notification` | `notification.controller.ts` → `notifications` | `NotificationService` | `Notification` |
| `supplier` | `supplier.controller.ts` → `suppliers`<br/>`resource-assignment.controller.ts` → `suppliers/resources` | `SupplierService`, `ResourceAssignmentService` | `Supplier`, `ResourceAssignment`, `DepartureSchedule` |
| `system` | `system-setting.controller.ts` → `system/settings`<br/>`audit-log.controller.ts` → `system/audit-logs`<br/>`email-template.controller.ts` → `system/email-templates`<br/>`banner.controller.ts` → `banners`<br/>`report.controller.ts` → `reports` | `AuditLogService`, `BannerService`, `EmailTemplateService`, `SystemSettingService` | `AuditLog`, `Banner`, `EmailTemplate`, `SystemSetting`, `User`, `Booking`, `Tour`, `Payment`, `Refund` |
| `upload` | `upload.controller.ts` → `uploads` | `UploadService` | — (ghi tệp vào `UPLOAD_ROOT`) |
| `support` | `support.controller.ts` → `support` | `SupportService` *(không export)* | `SupportTicket` |
| `mail` | — *(nội bộ)* | `MailOutboxService` | `MailMessage` |
| `maintenance` | — *(chỉ `@Cron`)* | — | dùng lại entity của schedule/booking/payment |

**Tổng đếm:** 16 module · 24 controller · 14 service được export · 38 entity.

---

## 4. Luồng một request đi qua backend

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (Web / Mobile)
    participant H as helmet + cookieParser
    participant G as Guard chain
    participant V as ValidationPipe
    participant CT as Controller
    participant S as Service
    participant R as TypeORM Repository
    participant DB as MySQL

    C->>H: HTTP /api/<route>
    H->>G: ThrottlerGuard (300 req/60s per IP)
    G->>G: JwtAuthGuard (@Public bỏ qua)
    G->>G: RolesGuard (@Roles)
    G->>G: PermissionsGuard (@RequirePermissions)
    G->>V: whitelist + forbidNonWhitelisted + transform
    V->>CT: DTO đã validate
    CT->>S: gọi nghiệp vụ (CurrentUser)
    S->>R: find / save / transaction
    R->>DB: SQL
    DB-->>S: row
    S-->>CT: entity / DTO
    CT-->>C: TransformInterceptor (envelope nếu RESPONSE_ENVELOPE=true)
    Note over CT,C: Lỗi → AllExceptionsFilter<br/>cùng shape + header x-request-id
```

---

## 5. Sơ đồ cấu trúc frontend (Web SPA)

`frontend/src/App.jsx` dùng **hash router tự viết** (`window.location.hash`), không dùng React Router.

```mermaid
flowchart TB
    APP["App.jsx<br/>useState(route) + hashchange"] --> GUARD{"routeForUser(user, route)"}
    GUARD -->|"redirect"| WS

    subgraph CUSTOMER["Khu khách hàng"]
        HOME["/ · pages/Home.jsx"]
        TOURS["/tours · pages/Tours.jsx"]
        DETAIL["/tours/:id · pages/TourDetail.jsx"]
        FAV["/favorites · Protected"]
        ACC["/account · /account/security<br/>/account/overview · AccountLayout"]
        BOOK["/booking/:id · permission booking:create"]
        BOOKS["/bookings · /bookings/:id"]
        PAY["/payment/:id · pages/Payment.jsx"]
        REV["/reviews · pages/Reviews.jsx"]
        NOTI2["/notifications · pages/Notifications.jsx"]
        SUP["/support · pages/Support.jsx"]
        LOGIN["/login · /forgot-password<br/>/reset-password"]
    end

    subgraph WS["Khu quản trị — Management"]
        ADMIN["/admin · pages/Workspace.jsx<br/>WorkspaceLayout"]
        STAFF["/staff · pages/StaffWorkspace.jsx<br/>StaffLayout"]
        WSACC["/{admin|staff}/account"]
        WSNOTI["/{admin|staff}/notifications"]
    end

    subgraph SHARED["Dùng chung"]
        NAV["components/Navbar · Footer · Brand · UI"]
        CTX["context/AuthContext.jsx"]
        APIS["services/api.js<br/>fetch + auto refresh token 401"]
        LIB["management.js · routing.js · booking-view.js<br/>motion.js · tilt.js · utils.js · hooks.js"]
    end

    APP --> CUSTOMER
    APP --> WS
    CUSTOMER --> SHARED
    WS --> SHARED
    APIS -->|"/api"| BE[("Backend NestJS")]
```

**Nhóm trang quản trị theo vai trò** (`docs/ADMIN-WORKSPACE.md`, `docs/STAFF-WORKSPACE.md`):

| Vai trò | Trang | Chức năng |
|---|---|---|
| ADMIN | `AdminDashboard`, `AdminOverview`, `Management`, `Moderation`, `Reports`, `Refunds`, `StaffUsers`, `Banners` | Quản lý tour, danh mục, người dùng, duyệt nội dung, báo cáo, hoàn tiền |
| STAFF | `StaffDashboard`, `StaffBookings`, `StaffPayments`, `StaffSchedules`, `StaffOperations` | Xử lý booking, thu tiền, điều lịch, điểm danh, sự cố |
| CUSTOMER | `Home`, `Tours`, `TourDetail`, `Booking`, `Payment`, `MyBookings`, `Favorites`, `Reviews`, `Support` | Đặt tour, thanh toán, đánh giá, hỗ trợ |

---

## 6. Sơ đồ cấu trúc mobile (Expo Router)

```mermaid
flowchart LR
    LAYOUT["app/_layout.tsx<br/>SessionProvider"] --> TABS

    subgraph TABS["app/(tabs)/_layout.tsx"]
        IDX["index.tsx — Home"]
        EXPL["explore.tsx — Khám phá"]
        BKS["bookings.tsx — Đơn của tôi"]
        FAVS["favorites.tsx"]
        NOTIS["notifications.tsx"]
        ACCS["account.tsx"]
    end

    LAYOUT --> LOGIN["login.tsx"]
    LAYOUT --> SUPP["support.tsx"]
    LAYOUT --> NOTF["+not-found.tsx"]
    TABS --> TOUR["tours/[id].tsx"]
    TOUR --> BOOKM["booking/[id].tsx"]
    BKS --> BOOKD["bookings/[id].tsx"]
    BOOKD --> PAYM["payment/[id].tsx"]
    BOOKD --> REVM["review/[id].tsx"]

    TOUR --> COMP
    subgraph COMP["components/"]
        HC["home-screen · explore-screen"]
        TC["tour-card · tour-gallery · tour-reviews"]
        UI["ui.tsx · brand.tsx · photo-backdrop"]
        PP["promotion-picker · birth-date-field"]
    end

    COMP --> LIB
    subgraph LIB["lib/ + hooks/ + context/"]
        APIC["api-client.ts · api.ts"]
        FMT["format.ts · invoice.ts · tour-filters.ts · destinations.ts · types.ts"]
        HOOK["hooks/use-resource.ts"]
        SESS["context/session.tsx"]
    end

    LIB -->|"HTTP"| BE[("Backend NestJS")]
```

---

## 7. Nhóm entity theo miền nghiệp vụ (38 entity)

```mermaid
flowchart TB
