import { TableColumn } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nâng cấp module mã giảm giá thành "chiến dịch khuyến mãi".
 *
 * Nguyên tắc: **chỉ thêm, không sửa/xóa**. Dữ liệu `promotions` cũ được giữ
 * nguyên; các cột mới đều có `DEFAULT` nên bản ghi cũ tự động nhận giá trị
 * tương đương hành vi trước đây:
 * - `status = 'ACTIVE'`  → mã cũ vẫn dùng được như trước.
 * - `kind = 'PUBLIC'`    → mã cũ là mã công khai, không cần assignment.
 * - `channel_scope = 'ALL'`, `customer_scope = 'ALL'` → không giới hạn.
 * - `stackable = 0`, `priority = 0`, `budget_used = 0`, `daily_used = 0`.
 *
 * Bốn bảng mới:
 * - `promotion_scopes`      – mã áp cho tour/danh mục/điểm đến/lịch cụ thể.
 * - `promotion_assignments` – mã cấp riêng cho từng khách (voucher tặng).
 * - `promotion_redemptions` – sổ cái từng lượt dùng (RESERVED/CONFIRMED/RELEASED).
 * - `booking_discounts`     – chi tiết từng dòng giảm giá của một đơn.
 *
 * `promotion_scopes.scope_id` cố ý **không** có FK: nó trỏ tới 4 bảng khác nhau
 * tuỳ `scope_type` nên MySQL không tạo được FK đa hình. Ràng buộc tồn tại được
 * kiểm ở tầng service trước khi ghi.
 */
export class PromotionCampaigns1794186000000 implements MigrationInterface {
  name = 'PromotionCampaigns1794186000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addPromotionColumns(queryRunner);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS promotion_scopes (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      promotion_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      scope_type varchar(20) NOT NULL,
      scope_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_promotion_scopes (promotion_id, scope_type, scope_id),
      KEY idx_promotion_scopes_target (scope_type, scope_id),
      CONSTRAINT fk_promotion_scopes_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS promotion_assignments (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      promotion_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      customer_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      assigned_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      used_at datetime(3) NULL,
      booking_id char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_promotion_assignments (promotion_id, customer_id),
      KEY idx_promotion_assignments_customer (customer_id, used_at),
      CONSTRAINT fk_promotion_assignments_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS promotion_redemptions (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      promotion_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      booking_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      customer_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      discount_amount decimal(14,0) NOT NULL DEFAULT 0,
      subtotal_at_use decimal(14,0) NOT NULL DEFAULT 0,
      status varchar(20) NOT NULL DEFAULT 'RESERVED',
      reserved_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      confirmed_at datetime(3) NULL,
      released_at datetime(3) NULL,
      release_reason varchar(30) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_promotion_redemptions (promotion_id, booking_id),
      KEY idx_promotion_redemptions_status (promotion_id, status),
      KEY idx_promotion_redemptions_customer (customer_id, status),
      CONSTRAINT fk_promotion_redemptions_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions (id) ON DELETE CASCADE,
      CONSTRAINT fk_promotion_redemptions_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await queryRunner.query(`CREATE TABLE IF NOT EXISTS booking_discounts (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      booking_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      promotion_id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      code_snapshot varchar(40) NOT NULL,
      type_snapshot varchar(20) NOT NULL,
      value_snapshot decimal(14,2) NOT NULL,
      discount_amount decimal(14,0) NOT NULL,
      exclusive_group varchar(40) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_booking_discounts (booking_id, promotion_id),
      KEY idx_booking_discounts_promotion (promotion_id),
      CONSTRAINT fk_booking_discounts_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE CASCADE,
      CONSTRAINT fk_booking_discounts_promotion FOREIGN KEY (promotion_id)
        REFERENCES promotions (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  /**
   * Không rollback tự động: các bảng mới chứa sổ cái lượt dùng mã và chi tiết
   * giảm giá của đơn đã bán – xóa đi là mất dấu vết đối soát tài chính.
   */
  async down(): Promise<void> {
    throw new Error('Migration chứa sổ cái lượt dùng mã giảm giá; không tự động xóa dữ liệu khi rollback.');
  }

  /** Thêm cột mới vào `promotions` nếu chưa có (idempotent, chạy lại an toàn). */
  private async addPromotionColumns(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('promotions');
    if (!table) return;

    const columns: TableColumn[] = [
      new TableColumn({ name: 'name', type: 'varchar', length: '150', isNullable: true }),
      new TableColumn({ name: 'description', type: 'varchar', length: '500', isNullable: true }),
      new TableColumn({ name: 'image_url', type: 'varchar', length: '500', isNullable: true }),
      new TableColumn({ name: 'status', type: 'varchar', length: '20', default: "'ACTIVE'" }),
      new TableColumn({ name: 'kind', type: 'varchar', length: '20', default: "'PUBLIC'" }),
      new TableColumn({ name: 'budget_cap', type: 'decimal', precision: 14, scale: 0, isNullable: true }),
      new TableColumn({ name: 'budget_used', type: 'decimal', precision: 14, scale: 0, default: 0 }),
      new TableColumn({ name: 'daily_limit', type: 'int', unsigned: true, isNullable: true }),
      new TableColumn({ name: 'daily_used', type: 'int', unsigned: true, default: 0 }),
      new TableColumn({ name: 'daily_date', type: 'date', isNullable: true }),
      new TableColumn({ name: 'channel_scope', type: 'varchar', length: '20', default: "'ALL'" }),
      new TableColumn({ name: 'customer_scope', type: 'varchar', length: '20', default: "'ALL'" }),
      new TableColumn({ name: 'stackable', type: 'boolean', default: false }),
      new TableColumn({ name: 'exclusive_group', type: 'varchar', length: '40', isNullable: true }),
      new TableColumn({ name: 'priority', type: 'int', default: 0 }),
      new TableColumn({ name: 'terms_text', type: 'text', isNullable: true }),
    ];

    const existing = new Set(table.columns.map(column => column.name));
    for (const column of columns) {
      if (!existing.has(column.name)) {
        await queryRunner.addColumn('promotions', column);
      }
    }

    const refreshed = await queryRunner.getTable('promotions');
    if (refreshed && !refreshed.indices.some(index => index.name === 'idx_promotions_status')) {
      await queryRunner.query('CREATE INDEX idx_promotions_status ON promotions (status, valid_from, valid_to)');
    }
  }
}
