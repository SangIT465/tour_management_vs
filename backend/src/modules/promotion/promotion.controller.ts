import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/auth.types.js';
import { BookingChannel } from '../../common/enums/index.js';
import {
  AssignPromotionDto,
  BestOfferDto,
  CreatePromotionDto,
  QueryPromotionsDto,
  QueryRedemptionsDto,
  ReplacePromotionScopesDto,
  UpdatePromotionDto,
  ValidatePromotionDto,
} from './dto/promotion.dto.js';
import { PromotionService } from './promotion.service.js';

/**
 * Mã khuyến mãi.
 *
 * - `GET /promotions/public` : công khai, không cần đăng nhập (trang chủ).
 * - `GET /promotions/available`, `GET /promotions/my-vouchers`, `POST /promotions/validate`,
 *   `POST /promotions/best-for-cart` : mọi người dùng đã đăng nhập (kể cả khách).
 * - CRUD + phạm vi + cấp mã + sổ cái + thống kê : `promotion:manage` (STAFF/ADMIN).
 *
 * Thứ tự khai báo route có ý nghĩa: các route tĩnh (`public`, `available`,
 * `my-vouchers`, `best-for-cart`) phải đứng **trước** `:id`, nếu không Nest sẽ
 * khớp `:id` với chuỗi tĩnh và trả 400 do `ParseUUIDPipe`.
 */
@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) { }

  // ===== cho khách =====

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Ưu đãi công khai đang chạy (không cần đăng nhập)' })
  publicList(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.promotionService.publicList(Number.isFinite(parsed) && parsed > 0 ? parsed : 12);
  }

  @Get('available')
  @ApiOperation({ summary: 'Mã ưu đãi còn hiệu lực và còn lượt dùng cho khách đang đăng nhập' })
  available(
    @CurrentUser() user: AuthenticatedUser,
    @Query('subtotal') subtotal?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('channel') channel?: BookingChannel,
  ) {
    const parsedSubtotal = Number(subtotal);
    return this.promotionService.available(user.id, {
      subtotal: Number.isFinite(parsedSubtotal) && parsedSubtotal >= 0 ? parsedSubtotal : undefined,
      scheduleId: scheduleId || undefined,
      channel: channel ?? BookingChannel.ONLINE,
    });
  }

  @Get('my-vouchers')
  @ApiOperation({ summary: 'Ví voucher của tôi: mã công khai + mã được cấp riêng' })
  myVouchers(@CurrentUser() user: AuthenticatedUser) {
    return this.promotionService.myVouchers(user.id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Áp thử mã khuyến mãi cho một tạm tính (không trừ lượt)',
    description: 'Trả về số tiền được giảm và tổng phải trả; ném 400 kèm lý do nếu mã không dùng được.',
  })
  validate(@Body() dto: ValidatePromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotionService.validate(dto, user.id);
  }

  @Post('best-for-cart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gợi ý tổ hợp mã tốt nhất cho giỏ hàng',
    description: 'Trả cả danh sách mã bị loại kèm lý do để FE giải thích cho khách.',
  })
  bestForCart(@Body() dto: BestOfferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotionService.bestOffer(dto, user.id);
  }

  // ===== quản trị =====

  @Get()
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Danh sách mã khuyến mãi (phân trang + lọc)' })
  list(@Query() query: QueryPromotionsDto) {
    return this.promotionService.paginate(query);
  }

  @Get('code/:code')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Tra mã khuyến mãi theo code' })
  getByCode(@Param('code') code: string) {
    return this.promotionService.getByCode(code);
  }

  @Get(':id')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Chi tiết mã khuyến mãi' })
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.getById(id);
  }

  @Post()
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Tạo mã khuyến mãi' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Cập nhật mã khuyến mãi' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionService.update(id, dto);
  }

  @Patch(':id/active')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Bật / tắt nhanh mã khuyến mãi' })
  setActive(@Param('id', new ParseUUIDPipe()) id: string, @Query('active', ParseBoolPipe) active: boolean) {
    return this.promotionService.setActive(id, active);
  }

  @Delete(':id')
  @RequirePermissions('promotion:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa mã khuyến mãi (chỉ khi chưa được dùng)' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.promotionService.remove(id);
  }

  // ===== phạm vi áp dụng =====

  @Get(':id/scopes')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Danh sách phạm vi áp dụng của mã' })
  listScopes(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.listScopes(id);
  }

  @Put(':id/scopes')
  @RequirePermissions('promotion:manage')
  @ApiOperation({
    summary: 'Thay toàn bộ phạm vi áp dụng',
    description: 'Mảng rỗng = áp toàn hệ thống. Id không tồn tại sẽ bị từ chối (không có FK đa hình).',
  })
  replaceScopes(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ReplacePromotionScopesDto) {
    return this.promotionService.replaceScopes(id, dto);
  }

  // ===== cấp mã riêng =====

  @Get(':id/assignments')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Danh sách khách được cấp mã' })
  listAssignments(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.listAssignments(id);
  }

  @Post(':id/assignments')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Cấp mã riêng cho danh sách khách (bỏ qua khách đã có)' })
  assign(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AssignPromotionDto) {
    return this.promotionService.assignToCustomers(id, dto);
  }

  // ===== sổ cái & thống kê =====

  @Get(':id/redemptions')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Sổ cái lượt dùng mã (phân trang, lọc theo trạng thái)' })
  redemptions(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: QueryRedemptionsDto) {
    return this.promotionService.paginateRedemptions(id, query);
  }

  @Get(':id/stats')
  @RequirePermissions('promotion:manage')
  @ApiOperation({ summary: 'Thống kê hiệu quả chiến dịch (đọc từ sổ cái)' })
  stats(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.promotionService.stats(id);
  }
}
