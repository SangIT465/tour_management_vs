import { ConfigService } from '@nestjs/config';
import { MailTransportService } from './mail-transport.service.js';
import { MailMessage } from './entities/mail-message.entity.js';

const smtp = vi.hoisted(() => ({
  sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn(),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: smtp.createTransport } }));

describe('SMTP transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    smtp.createTransport.mockReturnValue({ sendMail: smtp.sendMail, close: smtp.close });
  });

  const config = (values = {}) => new ConfigService({ MAIL_ENABLED: 'true', MAIL_FROM: 'TourGo <billing@example.test>', SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', ...values });

  it('uses bounded timeouts and TLS, without arbitrary file or URL attachments', () => {
    const transport = new MailTransportService(config());
    expect(smtp.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: false, requireTLS: true, disableFileAccess: true, disableUrlAccess: true, connectionTimeout: 10_000, socketTimeout: 20_000 }));
    transport.onModuleDestroy(); expect(smtp.close).toHaveBeenCalledTimes(1);
  });

  it('requires a complete SMTP configuration when enabled', () => {
    expect(() => new MailTransportService(config({ SMTP_HOST: '' }))).toThrow(/SMTP_HOST/);
    expect(() => new MailTransportService(config({ SMTP_PORT: 'invalid' }))).toThrow(/SMTP_PORT/);
    expect(() => new MailTransportService(config({ SMTP_USER: 'user' }))).toThrow(/SMTP_PASSWORD/);
  });

  it('sends the stored document to exactly one recipient with a stable message id', async () => {
    smtp.sendMail.mockResolvedValue({ accepted: ['customer@example.test'] });
    const transport = new MailTransportService(config());
    const message = Object.assign(new MailMessage(), { id: 'mail-id', recipient: 'customer@example.test', subject: 'Receipt', html: '<p>Paid</p>', text: 'Paid', attachmentName: 'invoice.html' });
    await transport.send(message);
    expect(smtp.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: { address: 'customer@example.test', name: '' }, messageId: '<mail-id@tour-management.mail>',
      attachments: [{ filename: 'invoice.html', content: '<p>Paid</p>', contentType: 'text/html; charset=utf-8' }],
    }));
  });

  it('treats an SMTP rejection as a delivery failure', async () => {
    smtp.sendMail.mockResolvedValue({ accepted: [], rejected: ['customer@example.test'] });
    const transport = new MailTransportService(config());
    await expect(transport.send(Object.assign(new MailMessage(), { recipient: 'customer@example.test' }))).rejects.toThrow(/người nhận/);
  });
});
