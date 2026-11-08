import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive upgrade: existing bookings, payments and invoices are preserved. */
export class PaymentReceipts1794099600000 implements MigrationInterface {
  name = 'PaymentReceipts1794099600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS mail_messages (
      id char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      deduplication_key varchar(100) NOT NULL,
      recipient varchar(191) NOT NULL,
      subject varchar(255) NOT NULL,
      html longtext NOT NULL,
      text text NOT NULL,
      attachment_name varchar(100) NULL,
      status varchar(16) NOT NULL DEFAULT 'PENDING',
      attempts int unsigned NOT NULL DEFAULT 0,
      next_attempt_at datetime(3) NOT NULL,
      lease_token char(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      sent_at datetime(3) NULL,
      last_error varchar(500) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_mail_messages_deduplication (deduplication_key),
      KEY idx_mail_messages_due (status, next_attempt_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const table = await queryRunner.getTable('bookings');
    if (table && !table.indices.some(index => index.name === 'idx_bookings_promotion_customer')) {
      await queryRunner.query('CREATE INDEX idx_bookings_promotion_customer ON bookings (promotion_id, customer_id, status)');
    }
  }

  async down(): Promise<void> {
    throw new Error('Migration chứa lịch sử email thanh toán; không tự động xóa dữ liệu khi rollback.');
  }
}
