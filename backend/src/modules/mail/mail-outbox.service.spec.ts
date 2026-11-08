import { MailOutboxService } from './mail-outbox.service.js';
import { MailMessage } from './entities/mail-message.entity.js';

function fixture(overrides = {}) {
  const row = Object.assign(new MailMessage(), {
    id: 'message', deduplicationKey: 'payment-receipt:payment', recipient: 'customer@example.test',
    subject: 'Receipt', html: '<p>Paid</p>', text: 'Paid', attachmentName: 'invoice.html',
    status: 'PENDING', attempts: 0, nextAttemptAt: new Date(), sentAt: null, leaseToken: null, ...overrides,
  });
  const repository: any = {
    findOne: vi.fn(async () => ['PENDING', 'SENDING'].includes(row.status) && row.nextAttemptAt <= new Date() ? Object.assign(new MailMessage(), row) : null),
    save: vi.fn(async (value: MailMessage) => { Object.assign(row, value); return Object.assign(new MailMessage(), row); }),
    update: vi.fn(async (where: any, values: any) => {
      if (row.id === where.id && row.leaseToken === where.leaseToken && row.status === where.status) Object.assign(row, values);
      return { affected: 1 };
    }),
    existsBy: vi.fn().mockResolvedValue(true), create: vi.fn(value => value),
  };
  const manager = { getRepository: () => repository, transaction: async (work: any) => work(manager) };
  repository.manager = manager;
  const transport = { enabled: true, send: vi.fn().mockResolvedValue(undefined) };
  return { service: new MailOutboxService(repository, transport as any), repository, manager, transport, row };
}

describe('Transactional mail outbox', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-08T10:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('keeps queued messages pending when delivery is disabled', async () => {
    const { service, transport, row } = fixture();
    transport.enabled = false;
    await service.processPending();
    expect(row.status).toBe('PENDING'); expect(row.attempts).toBe(0);
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('marks a claimed message SENT only after the transport accepts it', async () => {
    const { service, transport, row } = fixture();
    await service.processPending();
    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(row.status).toBe('SENT'); expect(row.sentAt).toEqual(new Date()); expect(row.leaseToken).toBeNull();
  });

  it('retries a transport failure with a delay and the same message ID', async () => {
    const { service, transport, row } = fixture();
    transport.send.mockRejectedValueOnce(Object.assign(new Error('SMTP private detail'), { code: 'ECONNECTION' }));
    await service.processPending();
    expect(row.status).toBe('PENDING'); expect(row.sentAt).toBeNull(); expect(row.lastError).toBe('ECONNECTION');
    expect(row.nextAttemptAt.getTime() - Date.now()).toBe(30_000);
    vi.setSystemTime(new Date(Date.now() + 30_001));
    await service.processPending();
    expect(row.status).toBe('SENT'); expect(row.attempts).toBe(2);
    expect(transport.send.mock.calls.map(([message]) => message.id)).toEqual(['message', 'message']);
  });

  it('recovers a leased message after a worker crash', async () => {
    const { service, row } = fixture({ status: 'SENDING', attempts: 1, leaseToken: 'abandoned', nextAttemptAt: new Date(Date.now() - 1) });
    await service.processPending();
    expect(row.status).toBe('SENT'); expect(row.attempts).toBe(2);
  });

  it('stops after eight attempts and preserves the failure for operations', async () => {
    const { service, transport, row } = fixture({ attempts: 7 });
    transport.send.mockRejectedValue(new Error('failed'));
    await service.processPending();
    expect(row.status).toBe('FAILED'); expect(row.attempts).toBe(8);
    expect(row.sentAt).toBeNull();
  });

  it('does not enqueue a second receipt for the same payment', async () => {
    const { service, repository, manager, row } = fixture();
    await service.enqueue(manager as any, row);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
