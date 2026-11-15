import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity.js';
import { Category } from '../catalog/entities/category.entity.js';
import { Destination } from '../catalog/entities/destination.entity.js';
import { Tour } from '../catalog/entities/tour.entity.js';
import { TourDestination } from '../catalog/entities/tour-destination.entity.js';
import { DepartureSchedule } from '../schedule/entities/departure-schedule.entity.js';
import { BookingDiscount } from './entities/booking-discount.entity.js';
import { PromotionAssignment } from './entities/promotion-assignment.entity.js';
import { PromotionRedemption } from './entities/promotion-redemption.entity.js';
import { PromotionScope } from './entities/promotion-scope.entity.js';
import { Promotion } from './entities/promotion.entity.js';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';

/**
 * Mã khuyến mãi.
 *
 * Không import module nào khác – đây là module lá, `BookingModule` / `PaymentModule`
 * có thể import lại để dùng `PromotionService` (validate, reserve, release).
 *
 * `TypeOrmModule.forFeature` khai báo thêm các entity **chỉ đọc** để service dựng
 * `DiscountContext` (tour → danh mục/điểm đến, lịch khởi hành) và đếm lượt dùng
 * của khách. Không import `CatalogModule`/`ScheduleModule` để tránh phụ thuộc vòng
 * (`CatalogModule` → `PromotionModule` cho giá khuyến mãi).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      PromotionScope,
      PromotionAssignment,
      PromotionRedemption,
      BookingDiscount,
      Booking,
      Tour,
      TourDestination,
      Category,
      Destination,
      DepartureSchedule,
    ]),
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule { }
