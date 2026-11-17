import { Injectable } from '@nestjs/common';
import { PassengerType, ScheduleStatus } from '../../../common/enums/index.js';
import { PromotionService } from '../../promotion/promotion.service.js';
import { ScheduleService } from '../../schedule/schedule.service.js';
import type { DepartureSchedule } from '../../schedule/entities/departure-schedule.entity.js';
import type { PassengerInputDto } from '../dto/booking.dto.js';
import type { BookingQuote } from '../types/booking.types.js';

const INFANT_MAX_AGE = 2;
const CHILD_MAX_AGE = 12;

/** Shared by preview and creation: age classification, ticket totals and promotion quotes. */
@Injectable()
export class BookingPricingService {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly promotionService: PromotionService,
  ) {}
  /** Báo giá trước khi đặt – cho FE thấy đúng số tiền server sẽ thu. */
  async quote(
    schedule: DepartureSchedule,
    passengers: PassengerInputDto[],
    promotionCode?: string,
    customerId?: string,
  ): Promise<BookingQuote> {
    const scheduleId = schedule.id;
    const priced = this.pricePassengers(schedule, passengers);
    const seatCount = this.countSeats(priced);

    const promotion = promotionCode
      ? await this.promotionService.findUsableOrFail(
          promotionCode,
          priced.subtotal,
          undefined,
          customerId,
        )
      : null;
    const discount = promotion
      ? promotion.calculateDiscount(priced.subtotal)
      : 0;

    const held = await this.scheduleService.sumActiveHeldSeats(scheduleId);
    return {
      scheduleId,
      tourId: schedule.tourId,
      tourName: schedule.tour?.name ?? '',
      startDate: schedule.startDate,
      lines: this.groupLines(priced),
      seatCount,
      subtotal: priced.subtotal,
      discount,
      total: priced.subtotal - discount,
      promotionCode: promotion?.code ?? null,
      availableSeats: Math.max(schedule.availableSeats(held), 0),
      canBook:
        schedule.status === ScheduleStatus.OPEN &&
        schedule.canBook(seatCount, held),
    };
  }
  // ===== nội bộ: tính giá (server là nguồn sự thật) =====

  /**
   * Suy loại hành khách từ `dob` và lấy giá tương ứng **từ lịch khởi hành**.
   *
   * Client chỉ gửi `fullName` + `dob`, mọi con số tiền đều do server quyết định –
   * đây là chốt chặn gian lận của luồng đặt tour.
   */
  pricePassengers(
    schedule: DepartureSchedule,
    passengers: PassengerInputDto[],
  ) {
    const startDate = schedule.startDate;
    const lines = passengers.map((passenger) => {
      const dob = this.normalizeDate(passenger.dob);
      const age = this.ageAt(dob, startDate);
      const type = this.classify(age);
      const unitPrice = this.priceFor(schedule, type);

      return {
        fullName: passenger.fullName.trim(),
        dob,
        gender: passenger.gender?.trim() || null,
        idNumber: passenger.idNumber?.trim() || null,
        type,
        unitPrice,
        age,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice, 0);
    return { lines, subtotal };
  }

  private classify(age: number): PassengerType {
    if (age < INFANT_MAX_AGE) return PassengerType.INFANT;
    if (age < CHILD_MAX_AGE) return PassengerType.CHILD;
    return PassengerType.ADULT;
  }

  private priceFor(schedule: DepartureSchedule, type: PassengerType): number {
    switch (type) {
      case PassengerType.INFANT:
        return Number(schedule.priceInfant ?? 0);
      case PassengerType.CHILD:
        return Number(schedule.priceChild ?? 0);
      default:
        return Number(schedule.priceAdult ?? 0);
    }
  }

  /** Em bé không chiếm ghế riêng. */
  countSeats(priced: { lines: { type: PassengerType }[] }): number {
    return priced.lines.filter((line) => line.type !== PassengerType.INFANT)
      .length;
  }

  private groupLines(priced: {
    lines: { type: PassengerType; unitPrice: number }[];
  }) {
    const order: PassengerType[] = [
      PassengerType.ADULT,
      PassengerType.CHILD,
      PassengerType.INFANT,
    ];
    const grouped = new Map<
      PassengerType,
      { quantity: number; unitPrice: number }
    >();

    for (const line of priced.lines) {
      const current = grouped.get(line.type);
      if (current) current.quantity += 1;
      else grouped.set(line.type, { quantity: 1, unitPrice: line.unitPrice });
    }

    return order
      .filter((type) => grouped.has(type))
      .map((type) => {
        const item = grouped.get(type)!;
        return {
          type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        };
      });
  }

  /** Tuổi tại ngày khởi hành – tính trên chuỗi `YYYY-MM-DD` để không lệch múi giờ. */
  private ageAt(dob: string, atDate: string): number {
    const [dy, dm, dd] = dob.split('-').map(Number);
    const [ay, am, ad] = atDate.slice(0, 10).split('-').map(Number);

    let age = ay - dy;
    if (am < dm || (am === dm && ad < dd)) age -= 1;
    return age;
  }

  private normalizeDate(value: string): string {
    return value.slice(0, 10);
  }
}
