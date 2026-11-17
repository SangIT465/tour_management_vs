import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BookingChannel,
  PromotionChannelScope,
  PromotionCustomerScope,
  PromotionKind,
  PromotionRedemptionStatus,
  PromotionScopeType,
  PromotionStatus,
  PromotionType,
} from '../../../common/enums/index.js';

/** Mã khuyến mãi: chữ, số, `_`, `-`; 3–40 ký tự (service tự đưa về IN HOA). */
const PROMOTION_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * Tạo mã khuyến mãi.
 *
 * Mọi ràng buộc nghiệp vụ (kiểu PERCENT ⇒ `value ≤ 100`, `valid_to > valid_from`,
 * `usage_limit ≥ 1`, `budget_cap ≥ 0`) được kiểm lại trong `PromotionService` vì
 * `@Column` của entity không sinh được CHECK trên MySQL.
 */
export class CreatePromotionDto {
  @ApiProperty({ example: 'DIHE2026', description: 'Mã giảm giá, không phân biệt hoa/thường' })
  @IsString()
  @Matches(PROMOTION_CODE_PATTERN, { message: 'Mã khuyến mãi chỉ gồm chữ, số, _ và -, dài 3–40 ký tự' })
  code: string;

  @ApiPropertyOptional({ example: 'Ưu đãi hè 2026', description: 'Tên chiến dịch hiển thị cho khách' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string | null;

  @ApiPropertyOptional({ description: 'Mô tả ngắn hiển thị trên thẻ ưu đãi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Ảnh minh hoạ chiến dịch' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiProperty({ enum: PromotionType, example: PromotionType.PERCENT })
  @IsEnum(PromotionType)
  type: PromotionType;

  @ApiProperty({
    example: 10,
    description: 'PERCENT: phần trăm giảm (0–100). FIXED: số tiền giảm (VNĐ)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 500000, description: 'Trần giảm khi type = PERCENT (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number | null;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Giá trị đơn tối thiểu để áp mã (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Tổng số lượt dùng tối đa. Bỏ trống = không giới hạn',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số lần tối đa mỗi người được dùng' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perUserLimit?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  validTo: string;

  @ApiPropertyOptional({ default: true, description: 'Bật/tắt nhanh mà không xóa mã' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ enum: PromotionStatus, default: PromotionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({ enum: PromotionKind, default: PromotionKind.PUBLIC })
  @IsOptional()
  @IsEnum(PromotionKind)
  kind?: PromotionKind;

  @ApiPropertyOptional({ example: 50_000_000, description: 'Trần tổng tiền giảm của chiến dịch (VNĐ)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetCap?: number | null;

  @ApiPropertyOptional({ example: 50, description: 'Trần số lượt mỗi ngày' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyLimit?: number | null;

  @ApiPropertyOptional({ enum: PromotionChannelScope, default: PromotionChannelScope.ALL })
  @IsOptional()
  @IsEnum(PromotionChannelScope)
  channelScope?: PromotionChannelScope;

  @ApiPropertyOptional({ enum: PromotionCustomerScope, default: PromotionCustomerScope.ALL })
  @IsOptional()
  @IsEnum(PromotionCustomerScope)
  customerScope?: PromotionCustomerScope;

  @ApiPropertyOptional({ default: false, description: 'Cho phép cộng dồn với mã khác' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  stackable?: boolean;

  @ApiPropertyOptional({ example: 'TOUR_DISCOUNT', description: 'Nhóm loại trừ: mã cùng nhóm không dùng chung' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  exclusiveGroup?: string | null;

  @ApiPropertyOptional({ default: 0, description: 'Số lớn hơn được ưu tiên chọn trước' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Điều kiện & điều khoản hiển thị cho khách' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  termsText?: string | null;
}

const _promotionOptionalBase = PartialType(CreatePromotionDto);

/** Cập nhật mã khuyến mãi – mọi trường đều tùy chọn. */
export class UpdatePromotionDto extends _promotionOptionalBase { }

export class QueryPromotionsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Tìm theo mã hoặc tên chiến dịch' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái bật/tắt (cột cũ)' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ enum: PromotionStatus })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiPropertyOptional({ enum: PromotionType })
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @ApiPropertyOptional({ enum: PromotionKind })
  @IsOptional()
  @IsEnum(PromotionKind)
  kind?: PromotionKind;

  @ApiPropertyOptional({ description: 'Chỉ lấy mã còn hiệu lực tại thời điểm hiện tại' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usableOnly?: boolean;
}

/** Áp thử mã trước khi đặt tour. */
export class ValidatePromotionDto {
  @ApiProperty({ example: 'DIHE2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 3500000, description: 'Tạm tính của đơn hàng (VNĐ)' })
  @IsInt()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Lịch khởi hành – để kiểm tra phạm vi áp dụng' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;
}

/** Một dòng phạm vi áp dụng. */
export class PromotionScopeDto {
  @ApiProperty({ enum: PromotionScopeType })
  @IsEnum(PromotionScopeType)
  scopeType: PromotionScopeType;

  @ApiProperty({ description: 'ID của tour / danh mục / điểm đến / lịch khởi hành' })
  @IsUUID()
  scopeId: string;
}

/** Thay toàn bộ phạm vi áp dụng của một mã (mảng rỗng = áp toàn hệ thống). */
export class ReplacePromotionScopesDto {
  @ApiProperty({ type: [PromotionScopeDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PromotionScopeDto)
  scopes: PromotionScopeDto[];
}

/** Cấp mã riêng cho danh sách khách. */
export class AssignPromotionDto {
  @ApiProperty({ type: [String], description: 'ID khách hàng được cấp mã' })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  customerIds: string[];
}

/** Gợi ý mã tốt nhất cho một giỏ hàng. */
export class BestOfferDto {
  @ApiProperty({ example: 3500000 })
  @IsInt()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Lịch khởi hành của đơn' })
  @IsUUID()
  scheduleId: string;

  @ApiPropertyOptional({ enum: BookingChannel, default: BookingChannel.ONLINE })
  @IsOptional()
  @IsEnum(BookingChannel)
  channel?: BookingChannel;
}

/** Truy vấn sổ cái lượt dùng của một mã. */
export class QueryRedemptionsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: PromotionRedemptionStatus })
  @IsOptional()
  @IsEnum(PromotionRedemptionStatus)
  status?: PromotionRedemptionStatus;
}
