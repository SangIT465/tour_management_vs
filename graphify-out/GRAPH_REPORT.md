# Graph Report - DoAnCNPM  (2026-11-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3216 nodes · 9502 edges · 140 communities (96 shown, 44 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 293 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a72819df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 129
- Community 130
- Community 131

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 146 edges
2. `RequirePermissions()` - 134 edges
3. `@nestjs/common` - 104 edges
4. `typeorm` - 86 edges
5. `CurrentUser` - 79 edges
6. `uuidv4()` - 72 edges
7. `Booking` - 70 edges
8. `User` - 67 edges
9. `Icon()` - 66 edges
10. `BaseEntity` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Gửi một email thử thật` --references--> `MailTransportService`  [INFERRED]
  docs/PAYMENT_RECEIPTS.md → backend/src/modules/mail/mail-transport.service.ts
- `11. Câu hỏi thường gặp khi bảo vệ` --references--> `PermissionsGuard`  [INFERRED]
  docs/THUYET-TRINH-FLOW-THEO-ROLE.md → backend/src/common/auth/permissions.guard.ts
- `Cập nhật môi trường hiện có` --references--> `PaymentReceipts1794099600000`  [INFERRED]
  docs/PAYMENT_RECEIPTS.md → backend/src/database/migrations/1794099600000-PaymentReceipts.ts
- `Trang chủ TourGo` --references--> `Banners()`  [INFERRED]
  docs/TRANG-CHU-TOURGO.md → frontend/src/components/Banners.jsx
- `Observability` --references--> `AppModule`  [INFERRED]
  backend/README.md → backend/src/app.module.ts

## Import Cycles
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/payment/entities/payment.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/payment/entities/payment-event.entity.ts -> backend/src/modules/payment/entities/payment.entity.ts -> backend/src/modules/payment/entities/payment-event.entity.ts`
- 2-file cycle: `backend/src/modules/payment/entities/payment.entity.ts -> backend/src/modules/payment/entities/refund.entity.ts -> backend/src/modules/payment/entities/payment.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/cancel-request.entity.ts -> backend/src/modules/payment/entities/refund.entity.ts -> backend/src/modules/booking/entities/cancel-request.entity.ts`
- 2-file cycle: `backend/src/modules/operations/entities/attendance.entity.ts -> backend/src/modules/schedule/entities/schedule-checkpoint.entity.ts -> backend/src/modules/operations/entities/attendance.entity.ts`
- 2-file cycle: `backend/src/modules/schedule/entities/departure-schedule.entity.ts -> backend/src/modules/schedule/entities/schedule-checkpoint.entity.ts -> backend/src/modules/schedule/entities/departure-schedule.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/review/entities/review.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/booking/entities/invoice.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/booking/entities/cancel-request.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/booking/entities/passenger.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/booking/entities/booking.entity.ts -> backend/src/modules/schedule/entities/departure-schedule.entity.ts -> backend/src/modules/booking/entities/booking.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/destination.entity.ts -> backend/src/modules/catalog/entities/tour-destination.entity.ts -> backend/src/modules/catalog/entities/destination.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/tour-destination.entity.ts -> backend/src/modules/catalog/entities/tour.entity.ts -> backend/src/modules/catalog/entities/tour-destination.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/category.entity.ts -> backend/src/modules/catalog/entities/tour.entity.ts -> backend/src/modules/catalog/entities/category.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/itinerary-day.entity.ts -> backend/src/modules/catalog/entities/tour.entity.ts -> backend/src/modules/catalog/entities/itinerary-day.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/tour-image.entity.ts -> backend/src/modules/catalog/entities/tour.entity.ts -> backend/src/modules/catalog/entities/tour-image.entity.ts`
- 2-file cycle: `backend/src/modules/catalog/entities/cancel-policy-rule.entity.ts -> backend/src/modules/catalog/entities/cancel-policy.entity.ts -> backend/src/modules/catalog/entities/cancel-policy-rule.entity.ts`
- 2-file cycle: `backend/src/modules/users/entities/permission.entity.ts -> backend/src/modules/users/entities/role.entity.ts -> backend/src/modules/users/entities/permission.entity.ts`
- 2-file cycle: `backend/src/modules/users/entities/role.entity.ts -> backend/src/modules/users/entities/user.entity.ts -> backend/src/modules/users/entities/role.entity.ts`
- 2-file cycle: `backend/src/modules/users/entities/auth-token.entity.ts -> backend/src/modules/users/entities/user.entity.ts -> backend/src/modules/users/entities/auth-token.entity.ts`

## Communities (140 total, 44 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (31): RefundReason, CANCEL, DUPLICATE_PAYMENT, LATE_PAYMENT, REJECTED, SCHEDULE_CANCELLED, WebhookEventType, IPN (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (21): routes, seedDemoDestinations(), source, tours, TourStatus, DRAFT, HIDDEN, PUBLISHED (+13 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (23): AssignmentStatus, ACTIVE, REVOKED, AttendanceStatus, ABSENT, LATE, PRESENT, GuideStatus (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (16): BaseEntity, CreatedOnlyEntity, uuidv4(), SoftDeletableEntity, jsonTransformer, moneyTransformer, stringArrayTransformer, BOOKING_TRANSITIONS (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (31): PaymentMethod, BANK_TRANSFER, MOMO, NO_CHARGE, OFFICE, VNPAY, PaymentStatus, EXPIRED (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (67): { defineConfig }, expoConfig, dependencies, expo@~57.0.32, expo-build-properties@~57.0.23, expo-constants@~57.0.23, expo-font@~57.0.4, expo-image@~57.0.5 (+59 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (20): generateOpaqueToken(), hashToken(), TokenType, REFRESH, RESET_PASSWORD, VERIFY_EMAIL, fixture(), AuthResult (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (48): BookingDetail(), action(), cancel(), BookingDetailScreen(), NotFound(), PaymentContent(), act(), simulate() (+40 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (21): AppModule, BookingModule, CatalogModule, MaintenanceModule, NotificationPayload, NotificationModule, CreateNotificationInput, PaymentModule (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (30): CheckDbModule, force, dataSource, MetadataInspector, PROMOTION_CATALOG, seedPromotionCatalog(), source, bootstrap() (+22 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (38): App(), Protected(), AccountLayout(), links, Brand(), CustomerLogin(), Footer(), StaffLayout() (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (17): Roles(), ROLES_KEY, RoleName, ADMIN, CUSTOMER, GUIDE, STAFF, UserStatus (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (11): ReviewStatus, HIDDEN, PENDING, VISIBLE, CreateReviewDto, ModerateReviewDto, QueryReviewsDto, ReviewController (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (4): AuthenticatedUser, CurrentUser, BookingController, NotificationController

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (7): GuideAssignmentController, GuideAssignmentService, IncidentController, IncidentService, OperationsService, GuideAssignmentView, IncidentView

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (38): RootLayout(), AuthField(), Login(), submit(), s, HeaderActions(), s, TabsLayout() (+30 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (42): PaymentReceipts1794099600000, Cần kiểm tra trên iPhone thật, Kiểm tra kỹ thuật, Kiểm tra TourGo Mobile — 09/11/2026, Kết quả, Phạm vi và môi trường, Sửa trong đợt kiểm tra, Cách sử dụng (+34 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (46): author, description, devDependencies, @nestjs/cli@^12.0.0, @nestjs/mau@^0.2.6, @nestjs/schematics@^12.0.0, @nestjs/testing@^12.0.1, oxlint@^1.58.0 (+38 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): PermissionMode, PERMISSIONS_KEY, PERMISSIONS_MODE_KEY, RequirePermissions(), IS_PUBLIC_KEY, Public(), RefreshTokenDto, UpdateCategoryDto (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (31): Trang chủ TourGo, Banners(), safeBannerLink(), BookingSuccess(), Navbar(), search(), expiry, percent (+23 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (5): CreatePromotionDto, QueryPromotionsDto, ValidatePromotionDto, PromotionService, PromotionView

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (26): submit(), buildFormBody(), localDateTimeInput(), boolean(), columnLabels, csvCell(), management, number() (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (23): browser, evaluate(), navigate(), noOverflow(), pause(), pending, runtimeErrors, send() (+15 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (20): BookingChannel, COUNTER, ONLINE, BookingStatus, CANCEL_REQUESTED, CANCELLED, COMPLETED, CONFIRMED (+12 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (7): SupportController, CreateSupportDto, QuerySupportDto, ReplySupportDto, SupportStatusDto, canManageSupport(), SupportService

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (38): 10. Phạm vi triển khai, 11. Công cụ vẽ UML, 12. Cấu trúc tài liệu báo cáo, 13. Kết luận, 1. Giới thiệu đề tài, 2. Công nghệ sử dụng, 3. Cấu trúc thư mục, 4.1. Khách hàng (+30 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (9): main(), MailMessage, MailStatus, MailModule, EnqueueMail, MailOutboxService, fixture(), MailTransportService (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (4): SystemSetting, SystemSettingController, SystemSettingService, SystemSettingView

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (21): PickupEditor(), save(), PaymentStatus(), ScheduleBookings(), OperationBadge(), OperationEmpty(), OperationFacts(), OperationHeader() (+13 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (12): normalizeTourSearch(), tourSearchPattern(), tourTextContains(), TourService, CancellationFeeQuote, CancelPolicyRuleView, CancelPolicyView, ItineraryDayView (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (4): UpdateSupplierDto, SupplierController, SupplierService, SupplierView

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (22): bookingProgress(), canRequestCancellation(), isAccountPath(), passengerGroups(), passengerLabels, paymentMethodLabels, InvoiceButton(), open() (+14 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (9): ConfirmBookingDto, CreateBookingDto, CreateCounterBookingDto, PassengerInputDto, ProcessCancelDto, QueryBookingsDto, QuoteBookingDto, RejectBookingDto (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (30): dependencies, bcrypt@^6.0.0, class-transformer@^0.5.1, class-validator@^0.15.1, cookie-parser@^1.4.7, helmet@^8.3.0, multer@^2.5.0, mysql2@^3.24.6 (+22 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (6): ScheduleService, CheckpointView, HoldView, ScheduleView, SeatQuote, SeatQuoteLine

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (4): AttendanceController, AttendanceService, MarkAttendanceDto, CheckpointAttendanceBoard

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (5): PassengerType, ADULT, CHILD, INFANT, BookingService

### Community 37 - "Community 37"
Cohesion: 0.35
Nodes (17): ActionDialog(), ActionForm(), Pagination(), State(), useApi(), Management(), Moderation(), Refunds() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.07
Nodes (28): scripts, build, db:build, db:check, db:migrate, db:seed, db:seed:destinations, db:seed:images (+20 more)

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (7): CreateBannerDto, CreateEmailTemplateDto, QueryAuditLogsDto, QueryBannersDto, QueryEmailTemplatesDto, UpdateBannerDto, UpsertSystemSettingDto

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (3): Destination, CategoryService, CategoryView

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (4): UpdateEmailTemplateDto, EmailTemplateService, EmailTemplate, EmailTemplateView

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (25): backgroundColor, foregroundImage, adaptiveIcon, package, predictiveBackGestureEnabled, usesNonExemptEncryption, typedRoutes, expo (+17 more)

### Community 45 - "Community 45"
Cohesion: 0.21
Nodes (6): CreateTourDto, ItineraryDayDto, QueryToursDto, TourDestinationDto, TourImageDto, UpdateTourStatusDto

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (6): CheckpointDto, CreateScheduleDto, HoldSeatsDto, QuerySchedulesDto, ReleaseHoldDto, UpdateScheduleStatusDto

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (5): SupplierType, HOTEL, TRANSPORT, ResourceAssignment, Supplier

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (15): SessionContextValue, methodNames, AvailablePromotion, Booking, Invoice, Notice, Passenger, Payment (+7 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (17): TourForm(), submit(), AdminDashboard(), edit(), remove(), applyPromotion(), submit(), Favorites() (+9 more)

### Community 53 - "Community 53"
Cohesion: 0.26
Nodes (7): AttendanceEntryDto, CreateAssignmentDto, CreateIncidentDto, QueryAssignmentsDto, QueryIncidentsDto, RevokeAssignmentDto, UpdateIncidentDto

### Community 55 - "Community 55"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (14): @nestjs/platform-express@^12.0.1, ACCEPT_ATTRIBUTE, ALLOWED_MIME_TYPES, AllowedMime, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_REQUEST, UPLOAD_FOLDERS, UPLOAD_PUBLIC_PREFIX (+6 more)

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (12): ApiError, createApiClient(), perform(), request(), rotate(), session(), setSession(), normalizeApiUrl() (+4 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (18): 1. Chuẩn bị trước khi đăng nhập, 2. Tra cứu nhanh, 3. Hướng dẫn cho quản trị viên (ADMIN), 4. Hướng dẫn cho nhân viên (STAFF), 5. Hướng dẫn cho khách hàng (CUSTOMER), 6. Đổi mật khẩu và đăng xuất, 7. Lỗi thường gặp, Admin / STAFF (+10 more)

### Community 62 - "Community 62"
Cohesion: 0.25
Nodes (13): popularTours(), revenueMonths(), AdminOverview(), colors, Heading(), link(), Result(), Heading() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (6): BookingQuote, BookingQuoteLine, BookingSummaryView, CancelRequestView, InvoiceView, PassengerView

### Community 64 - "Community 64"
Cohesion: 0.24
Nodes (4): CreateResourceAssignmentDto, CreateSupplierDto, QueryResourceAssignmentsDto, QuerySuppliersDto

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (17): dependencies, react@^19.0.0, react-dom@^19.0.0, devDependencies, vite@^8.0.0, react, react-dom, vite (+9 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (8): @nestjs/jwt@^12.0.3, @nestjs/passport@^12.0.0, JwtPayload, AuthModule, JwtStrategy, UsersModule, @nestjs/jwt, @nestjs/passport

### Community 69 - "Community 69"
Cohesion: 0.32
Nodes (12): BookingForm(), submit(), BookingScreen(), BirthDateField(), show(), Field(), date(), isValidBirthday() (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.23
Nodes (12): Explorer(), apply(), reset(), update(), ExploreScreen(), s, query(), filterKeys (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (16): NotificationType, BOOKING_CANCELLED, BOOKING_COMPLETED, BOOKING_CONFIRMED, BOOKING_CREATED, BOOKING_REJECTED, CANCEL_REQUESTED, DEPARTURE_REMINDER (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (5): MockPaymentGateway, GatewayInitResult, GatewayVerifyResult, GatewayWebhookPayload, PaymentGateway

### Community 75 - "Community 75"
Cohesion: 0.12
Nodes (15): engines, node, name, private, scripts, build, check, check:integration (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.16
Nodes (3): AuditLogController, AuditLogService, AuditLogView

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (5): CancelRequestStatus, APPROVED, PENDING, REJECTED, CancelRequest

### Community 83 - "Community 83"
Cohesion: 0.18
Nodes (10): Compile and run the project, Deployment, Khởi tạo dữ liệu role / permission / admin, License, Observability, Project setup, Resources, Run tests (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (3): NotificationService, NotificationView, UnreadCountView

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (5): rxjs@^7.8.1, ApiSuccessBody, TransformInterceptor, bootstrap(), rxjs

### Community 89 - "Community 89"
Cohesion: 0.20
Nodes (4): Bảo mật đã xử lý, Description, JwtAuthGuard, RolesGuard

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (3): AllExceptionsFilter, ApiErrorBody, ValidationDetail

### Community 93 - "Community 93"
Cohesion: 0.20
Nodes (9): 12. Tóm tắt một trang (dùng làm slide cuối), 2.1 Thứ tự guard bảo mật (rất quan trọng khi thuyết trình), 2. Kiến trúc tổng quan, 3.1 Bộ quyền theo vai trò, 3.2 Những gì STAFF **không** có (câu hỏi hay gặp khi bảo vệ), 3. Ma trận phân quyền, 8. Bảo mật — Các điểm đáng nói, 9. Kịch bản demo gợi ý (5–7 phút) (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (9): Bổ sung chức năng khách hàng / Admin / STAFF (28/10/2026), Chạy cục bộ, Chức năng, Hiệu ứng 3D, Hiệu ứng giao diện, Kiểm tra, Lệnh kiểm tra, Phạm vi và triển khai (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.20
Nodes (10): scripts, android, api:check, export:check, ios, lint, start, test (+2 more)

### Community 96 - "Community 96"
Cohesion: 0.20
Nodes (9): compilerOptions, allowImportingTsExtensions, paths, strict, types, extends, include, @/assets/* (+1 more)

### Community 97 - "Community 97"
Cohesion: 0.28
Nodes (7): ADMIN_PERMISSIONS, CUSTOMER_PERMISSIONS, GUIDE_PERMISSIONS, PERMISSION_DEFINITIONS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, STAFF_PERMISSIONS

### Community 102 - "Community 102"
Cohesion: 0.22
Nodes (8): Giao diện nhân viên, Không gian nhân viên TourGo, Kiểm tra, Liên kết thanh toán – đơn – lịch, Lệnh kiểm tra, Màn nghiệp vụ đơn & lịch khởi hành, Nhập lịch đón và điểm hẹn, Tách khỏi Admin

### Community 103 - "Community 103"
Cohesion: 0.25
Nodes (8): ScheduleStatus, CANCELLED, CLOSED, COMPLETED, DRAFT, FULL, ONGOING, OPEN

### Community 107 - "Community 107"
Cohesion: 0.25
Nodes (7): compilerOptions, incremental, outDir, exclude, extends, include, ./tsconfig.json

### Community 108 - "Community 108"
Cohesion: 0.25
Nodes (7): Admin, Các phần còn phải làm để đạt đầy đủ yêu cầu production, Cập nhật máy khác (không xóa dữ liệu), Khách hàng, Kiểm thử & dữ liệu demo, Nhân viên, Đối chiếu chức năng khách hàng / Admin / nhân viên

### Community 109 - "Community 109"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 110 - "Community 110"
Cohesion: 0.29
Nodes (7): ResourceType, BOAT, BUS, FLIGHT, HOTEL, OTHER, TRAIN

### Community 111 - "Community 111"
Cohesion: 0.38
Nodes (4): date(), methods, money(), renderInvoice()

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 113 - "Community 113"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 116 - "Community 116"
Cohesion: 0.33
Nodes (5): Chi tiết đơn, Giao diện theo mẫu TourGo, Khác biệt có chủ đích so với ảnh mẫu, Kiểm tra, Phạm vi

### Community 117 - "Community 117"
Cohesion: 0.33
Nodes (5): Building with EAS, Commands, Expo has changed — do not trust your training data, Navigation & Routing, Rules

### Community 119 - "Community 119"
Cohesion: 0.40
Nodes (4): Giao diện khách hàng — ViVu Travel, Kiểm tra, Tệp chính, Định hướng thiết kế

### Community 121 - "Community 121"
Cohesion: 0.50
Nodes (3): Danh sách và biểu mẫu gọn cho ba vai trò, Dashboard theo mẫu TourGo, Giao diện quản trị tách biệt

### Community 122 - "Community 122"
Cohesion: 0.50
Nodes (3): Chức năng, Khám phá tour — TourGo, Xác minh

### Community 123 - "Community 123"
Cohesion: 0.50
Nodes (3): Giới hạn và hành vi, Kiểm tra, Thanh toán TourGo

### Community 124 - "Community 124"
Cohesion: 0.50
Nodes (4): 1.1 Bài toán, 1.2 Ba nhóm người dùng chính, 1.3 Nguyên tắc thiết kế xuyên suốt, 1. Mở đầu — Bài toán và phạm vi

### Community 125 - "Community 125"
Cohesion: 0.50
Nodes (4): 4.1 Sơ đồ luồng tổng quát, 4.2 Các bước chi tiết, 4.3 Trạng thái đơn đặt tour (BookingStatus), 4. LUỒNG 1 — KHÁCH HÀNG (CUSTOMER)

### Community 126 - "Community 126"
Cohesion: 0.50
Nodes (4): 5.1 Sơ đồ luồng tổng quát, 5.2 Các bước chi tiết, 5.3 Điểm nhấn khi thuyết trình, 5. LUỒNG 2 — NHÂN VIÊN (STAFF)

### Community 127 - "Community 127"
Cohesion: 0.50
Nodes (4): 6.1 Sơ đồ luồng tổng quát, 6.2 Các bước chi tiết, 6.3 Điểm nhấn khi thuyết trình, 6. LUỒNG 3 — QUẢN TRỊ VIÊN (ADMIN)

### Community 129 - "Community 129"
Cohesion: 0.67
Nodes (3): 10.1 Giới hạn cần nói rõ (thể hiện sự trung thực), 10.2 Hướng phát triển, 10. Giới hạn hiện tại & hướng phát triển

### Community 130 - "Community 130"
Cohesion: 0.67
Nodes (3): 7.1 Nhánh huỷ đơn, 7.2 Quy tắc nghiệp vụ cần nhấn mạnh, 7. LUỒNG XUYÊN VAI TRÒ — Vòng đời một đơn đặt tour

## Knowledge Gaps
- **101 isolated node(s):** `ACTIVE`, `LOCKED`, `PENDING_VERIFY`, `CUSTOMER`, `STAFF` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1128 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Community 8` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 11`, `Community 17`, `Community 18`, `Community 23`, `Community 24`, `Community 26`, `Community 32`, `Community 33`, `Community 39`, `Community 41`, `Community 47`, `Community 57`, `Community 67`, `Community 73`, `Community 82`, `Community 88`, `Community 90`, `Community 100`?**
  _High betweenness centrality (0.269) - this node is a cross-community bridge._
- **What connects `ACTIVE`, `LOCKED`, `PENDING_VERIFY` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05721434528773978 - nodes in this community are weakly interconnected._
- **Why does `AuthenticatedUser` connect `Community 13` to `Community 0`, `Community 2`, `Community 4`, `Community 6`, `Community 11`, `Community 12`, `Community 14`, `Community 18`, `Community 23`, `Community 24`, `Community 35`, `Community 36`, `Community 43`, `Community 48`, `Community 49`, `Community 54`, `Community 60`, `Community 63`, `Community 67`, `Community 98`, `Community 111`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.037311894454751596 - nodes in this community are weakly interconnected._
- **Why does `RequirePermissions()` connect `Community 18` to `Community 0`, `Community 3`, `Community 8`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 24`, `Community 27`, `Community 30`, `Community 35`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 49`, `Community 50`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 65`, `Community 76`, `Community 78`, `Community 98`, `Community 100`, `Community 106`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.03607262302914477 - nodes in this community are weakly interconnected._