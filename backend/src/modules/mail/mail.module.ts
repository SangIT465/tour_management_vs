import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailMessage } from './entities/mail-message.entity.js';
import { MailTransportService } from './mail-transport.service.js';
import { MailOutboxService } from './mail-outbox.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MailMessage])],
  providers: [MailTransportService, MailOutboxService],
  exports: [MailOutboxService],
})
export class MailModule {}
