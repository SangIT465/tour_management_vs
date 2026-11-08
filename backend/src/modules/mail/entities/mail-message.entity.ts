import { BeforeInsert, Column, Entity, Index } from 'typeorm';
import { BaseEntity, uuidv4 } from '../../../common/entities/base.entity.js';

export type MailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';

/** Transactional outbox: payment and message are committed together. */
@Entity('mail_messages')
@Index('uq_mail_messages_deduplication', ['deduplicationKey'], { unique: true })
@Index('idx_mail_messages_due', ['status', 'nextAttemptAt'])
export class MailMessage extends BaseEntity {
  @Column({ name: 'deduplication_key', type: 'varchar', length: 100 })
  deduplicationKey: string;

  @Column({ type: 'varchar', length: 191 })
  recipient: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'longtext' })
  html: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'attachment_name', type: 'varchar', length: 100, nullable: true })
  attachmentName: string | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: MailStatus;

  @Column({ type: 'int', unsigned: true, default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'datetime', precision: 3 })
  nextAttemptAt: Date;

  @Column({ name: 'lease_token', type: 'char', length: 36, charset: 'ascii', collation: 'ascii_bin', nullable: true })
  leaseToken: string | null;

  @Column({ name: 'sent_at', type: 'datetime', precision: 3, nullable: true })
  sentAt: Date | null;

  @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @BeforeInsert()
  protected ensureId(): void { this.id ??= uuidv4(); }
}
