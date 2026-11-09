import 'reflect-metadata';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { ScheduleStatus, TourStatus } from '../src/common/enums/index.js';
import { CancelPolicy } from '../src/modules/catalog/entities/cancel-policy.entity.js';
import { Category } from '../src/modules/catalog/entities/category.entity.js';
import { TourDestination } from '../src/modules/catalog/entities/tour-destination.entity.js';
import { Tour } from '../src/modules/catalog/entities/tour.entity.js';
import { DepartureSchedule } from '../src/modules/schedule/entities/departure-schedule.entity.js';
import { MailTransportService } from '../src/modules/mail/mail-transport.service.js';
import { seedDemoDestinations } from '../scripts/lib/demo-destinations.js';

const fixtures = [
  { code: 'DEMO-NB', name: 'Ninh Bình – Tràng An: Về miền non nước', summary: 'Non nước Tràng An và cố đô', city: 'Hà Nội', days: 2, price: 1_890_000, category: 'mountain', rating: 4.1 },
  { code: 'DEMO-HL', name: 'Hạ Long: Một đêm giữa miền kỳ quan', summary: 'Vịnh biển và du thuyền', city: 'Hà Nội', days: 2, price: 3_590_000, category: 'coast', rating: 4.9 },
  { code: 'DEMO-DL', name: 'Đà Lạt: Một khoảng trời bình yên', summary: 'Khí hậu cao nguyên', city: 'TP. Hồ Chí Minh', days: 3, price: 2_790_000, category: 'rest', rating: 3.7 },
  { code: 'DEMO-SP', name: 'Sa Pa – Fansipan: Hẹn với mây trời', summary: 'Trải nghiệm miền núi', city: 'Hà Nội', days: 3, price: 3_290_000, category: 'mountain', rating: 4.5 },
  { code: 'DEMO-PQ', name: 'Phú Quốc: Chạm vào mùa biển xanh', summary: 'Biển đảo nghỉ dưỡng', city: 'TP. Hồ Chí Minh', days: 3, price: 4_490_000, category: 'rest', rating: 4.8 },
  { code: 'DEMO-DNHA', name: 'Đà Nẵng – Hội An: Hành trình miền di sản', summary: 'Di sản và phố cổ', city: 'Hà Nội', days: 4, price: 5_990_000, category: 'coast', rating: 4.3 },
] as const;

/** Real MySQL queries against a disposable database, with no external email. */
describe('Tour search and filters (MySQL)', () => {
  const database = `tour_search_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let admin: DataSource;
  let source: DataSource;
  let app: INestApplication;
  const categories = new Map<string, Category>();
  const tours = new Map<string, Tour>();
  const allPublic = [...fixtures.map(item => item.code), 'TEST-NOPRICE', 'TEST-FREE', 'TEST-MARKS'];

  beforeAll(async () => {
    const connection = { type: 'mysql' as const, host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306), username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '', timezone: '+07:00', charset: 'utf8mb4' };
    admin = new DataSource(connection);
    await admin.initialize();
    if (!/^tour_search_test_[a-f0-9]{12}$/.test(database) || database === process.env.DB_DATABASE) throw new Error('Unsafe test database');
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    source = new DataSource({ ...connection, database, entities: ALL_ENTITIES, synchronize: true });
    await source.initialize();
    const policy = await source.getRepository(CancelPolicy).save({ id: randomUUID(), name: 'Search test policy' });
    for (const key of ['mountain', 'coast', 'rest', 'heritage']) categories.set(key, await source.getRepository(Category).save({ id: randomUUID(), name: key, slug: `search-${key}` }));
    const start = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
    const schedule = async (tour: Tour, price: number, status = ScheduleStatus.OPEN, date = start) => source.getRepository(DepartureSchedule).save({ id: randomUUID(), tourId: tour.id, startDate: date, endDate: end, priceAdult: price, priceChild: Math.round(price * .75), priceInfant: 0, maxSeats: 30, soldSeats: 0, status });
    for (const [index, item] of fixtures.entries()) {
      const tour = await source.getRepository(Tour).save({ id: randomUUID(), code: item.code, slug: item.code.toLowerCase(), name: item.name, summary: item.summary, departureCity: item.city, durationDays: item.days, durationNights: item.days - 1, status: TourStatus.PUBLISHED, cancelPolicyId: policy.id, avgRating: item.rating, reviewCount: 1, categories: [categories.get(item.category)!, ...(item.code === 'DEMO-DNHA' ? [categories.get('heritage')!] : [])], createdAt: new Date(Date.UTC(2026, 0, index + 1)) });
      tours.set(item.code, tour);
      await schedule(tour, item.price);
    }
    await schedule(tours.get('DEMO-HL')!, 4_200_000);
    await schedule(tours.get('DEMO-HL')!, 1_000, ScheduleStatus.OPEN, '2020-01-01');
    await schedule(tours.get('DEMO-HL')!, 2_000, ScheduleStatus.CLOSED);
    const extras = [
      { code: 'TEST-NOPRICE', name: 'Chưa có lịch', status: TourStatus.PUBLISHED, price: null },
      { code: 'TEST-FREE', name: 'Tour miễn phí', status: TourStatus.PUBLISHED, price: 0 },
      { code: 'TEST-MARKS', name: 'Ưu đãi 50% _ khám phá!', status: TourStatus.PUBLISHED, price: 2_500_000 },
      { code: 'TEST-HIDDEN', name: 'Hidden secret', status: TourStatus.HIDDEN, price: 1 },
      { code: 'TEST-DRAFT', name: 'Draft secret', status: TourStatus.DRAFT, price: 1 },
      { code: 'TEST-DELETED', name: 'Deleted secret', status: TourStatus.PUBLISHED, price: 1 },
    ];
    for (const [index, item] of extras.entries()) {
      const tour = await source.getRepository(Tour).save({ id: randomUUID(), code: item.code, slug: item.code.toLowerCase(), name: item.name, durationDays: 1, durationNights: 0, status: item.status, cancelPolicyId: policy.id, avgRating: 0, reviewCount: 0, createdAt: new Date(Date.UTC(2026, 0, index + 7)) });
      tours.set(item.code, tour);
      if (item.price !== null) await schedule(tour, item.price);
      if (item.code === 'TEST-DELETED') await source.getRepository(Tour).softDelete(tour.id);
    }
    expect(await source.transaction(manager => seedDemoDestinations(manager))).toEqual({ destinationsCreated: 11, linksCreated: 11, toursLinked: 6 });
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DataSource).useValue(source)
      .overrideProvider(MailTransportService).useValue({ enabled: false, send: vi.fn() }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();
    for (const job of app.get(SchedulerRegistry).getCronJobs().values()) await job.stop();
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
    if (admin?.isInitialized) {
      if (!/^tour_search_test_[a-f0-9]{12}$/.test(database) || database === process.env.DB_DATABASE) throw new Error('Unsafe test cleanup');
      await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await admin.destroy();
    }
  });

  async function list(query: Record<string, string | number> = {}) {
    return (await request(app.getHttpServer()).get('/api/tours').query({ limit: 100, ...query }).expect(200)).body;
  }
  function codes(data: { items: { code: string }[] }) { return data.items.map(item => item.code); }

  it.each([
    ['one letter', 'q', ['DEMO-HL', 'DEMO-PQ']], ['one word', 'Long', ['DEMO-HL']], ['accented word', 'Hội', ['DEMO-DNHA']],
    ['no accents with đ', 'da lat', ['DEMO-DL']], ['uppercase', 'ĐÀ LẠT', ['DEMO-DL']], ['mixed case', 'pHÚ qUốC', ['DEMO-PQ']],
    ['multiple spaces', '  Da   Lat  ', ['DEMO-DL']], ['decomposed Unicode', 'Đà Lạt'.normalize('NFD'), ['DEMO-DL']],
    ['tour code', 'demo-sp', ['DEMO-SP']], ['linked destination', 'Hang Múa', ['DEMO-NB']],
    ['departure text', 'ho chi minh', ['DEMO-DL', 'DEMO-PQ']], ['literal percent', '%', ['TEST-MARKS']],
    ['literal underscore', '_', ['TEST-MARKS']], ['literal escape', '!', ['TEST-MARKS']], ['literal combination', '50% _', ['TEST-MARKS']],
    ['unknown text', 'zzzzkhongcotour', []], ['SQL punctuation', "' OR 1=1 --", []], ['hidden data', 'secret', []],
  ])('searches %s', async (_name, search, expected) => {
    expect(codes(await list({ search: search as string })).sort()).toEqual([...(expected as string[])].sort());
  });

  it('allows one-character search and treats blank text as no filter', async () => {
    expect((await list({ search: 'h' })).total).toBeGreaterThan(1);
    expect(codes(await list({ search: '   ' })).sort()).toEqual([...allPublic].sort());
  });

  it.each([
    ['Hạ Long', 'DEMO-HL'], ['long', 'DEMO-HL'], ['hoi an', 'DEMO-DNHA'], ['Đà Nẵng', 'DEMO-DNHA'],
    ['phu quoc', 'DEMO-PQ'], ['Sa Pa', 'DEMO-SP'], ['da lat', 'DEMO-DL'], ['ninh binh', 'DEMO-NB'], ['trang an', 'DEMO-NB'],
  ])('filters linked destination %s', async (destination, expected) => {
    expect(codes(await list({ destination }))).toEqual([expected]);
  });

  it('supports partial departure names, without confusing departure and destination', async () => {
    const hanoi = ['DEMO-NB', 'DEMO-HL', 'DEMO-SP', 'DEMO-DNHA'].sort();
    expect(codes(await list({ departureCity: 'Hà' })).sort()).toEqual(hanoi);
    expect(codes(await list({ departureCity: 'ha noi' })).sort()).toEqual(hanoi);
    expect(codes(await list({ departureCity: 'ho chi minh' })).sort()).toEqual(['DEMO-DL', 'DEMO-PQ']);
    expect((await list({ departureCity: 'da nang' })).total).toBe(0);
    expect((await list({ destination: '%' })).total).toBe(0);
    expect((await list({ departureCity: '_' })).total).toBe(0);
  });

  it('filters categories without duplicated tours when a tour belongs to several categories', async () => {
    expect(codes(await list({ categoryId: categories.get('coast')!.id })).sort()).toEqual(['DEMO-DNHA', 'DEMO-HL']);
    expect(codes(await list({ categoryId: categories.get('mountain')!.id })).sort()).toEqual(['DEMO-NB', 'DEMO-SP']);
    expect(codes(await list({ categoryId: categories.get('rest')!.id })).sort()).toEqual(['DEMO-DL', 'DEMO-PQ']);
    expect((await list()).total).toBe(allPublic.length);
  });

  it('uses current open schedule prices, including zero and inclusive endpoints', async () => {
    expect(codes(await list({ minPrice: 3_000_000, maxPrice: 4_000_000 })).sort()).toEqual(['DEMO-HL', 'DEMO-SP']);
    expect(codes(await list({ minPrice: 1_890_000, maxPrice: 1_890_000 }))).toEqual(['DEMO-NB']);
    expect(codes(await list({ minPrice: 0, maxPrice: 0 }))).toEqual(['TEST-FREE']);
    expect(codes(await list({ maxPrice: 1_000 }))).toEqual(['TEST-FREE']);
    const hạLong = (await list({ search: 'Hạ Long' })).items[0];
    expect(hạLong.fromPrice).toBe(3_590_000);
  });

  it('combines duration, destination, departure, category and budget using AND', async () => {
    expect(codes(await list({ minDays: 3, maxDays: 3 })).sort()).toEqual(['DEMO-DL', 'DEMO-PQ', 'DEMO-SP']);
    expect(codes(await list({ search: 'Long', destination: 'ha long', departureCity: 'ha', categoryId: categories.get('coast')!.id, minPrice: 3_000_000, maxPrice: 4_000_000, minDays: 2, maxDays: 2 }))).toEqual(['DEMO-HL']);
    expect((await list({ destination: 'hoi an', categoryId: categories.get('mountain')!.id })).total).toBe(0);
  });

  it.each([
    { minPrice: 4_000_000, maxPrice: 3_000_000 }, { minDays: 4, maxDays: 2 }, { minPrice: -1 }, { minPrice: 'abc' },
    { minDays: 0 }, { maxDays: 366 }, { categoryId: 'invalid-uuid' }, { page: 0 }, { limit: 101 }, { sortBy: 'unsafe' },
  ])('rejects invalid filters %j', async query => {
    await request(app.getHttpServer()).get('/api/tours').query(query).expect(400);
  });

  it.each(['ASC', 'DESC'])('sorts numeric fields and places missing prices last (%s)', async sortOrder => {
    for (const [sortBy, field] of [['price', 'fromPrice'], ['durationDays', 'durationDays'], ['avgRating', 'avgRating']]) {
      const values = (await list({ sortBy, sortOrder })).items.map((item: Record<string, number | null>) => item[field]);
      if (sortBy === 'price') expect(values.at(-1)).toBeNull();
      const numeric = values.filter((value: number | null): value is number => value !== null);
      expect(numeric).toEqual([...numeric].sort((a: number, b: number) => sortOrder === 'ASC' ? a - b : b - a));
    }
  });

  it('sorts by name and creation date in both directions', async () => {
    const names = ['TEST-NOPRICE', 'DEMO-DL', 'DEMO-DNHA', 'DEMO-HL', 'DEMO-NB', 'DEMO-PQ', 'DEMO-SP', 'TEST-FREE', 'TEST-MARKS'];
    expect(codes(await list({ sortBy: 'name', sortOrder: 'ASC' }))).toEqual(names);
    expect(codes(await list({ sortBy: 'name', sortOrder: 'DESC' }))).toEqual([...names].reverse());
    expect(codes(await list({ sortBy: 'createdAt', sortOrder: 'ASC' }))).toEqual(allPublic);
    expect(codes(await list({ sortBy: 'createdAt', sortOrder: 'DESC' }))).toEqual([...allPublic].reverse());
  });

  it('paginates joined categories and computed prices without missing or repeating tours', async () => {
    const pages: string[] = [];
    for (let page = 1; page <= Math.ceil(allPublic.length / 2); page++) {
      const data = await list({ sortBy: 'price', sortOrder: 'ASC', page, limit: 2 });
      expect(data.total).toBe(allPublic.length);
      pages.push(...codes(data));
    }
    expect(pages).toEqual(codes(await list({ sortBy: 'price', sortOrder: 'ASC' })));
    expect(new Set(pages).size).toBe(allPublic.length);
    expect((await list({ page: 100, limit: 2 })).items).toEqual([]);
    expect((await list({ status: 'DRAFT' })).total).toBe(allPublic.length);
  });

  it('preserves existing destination routes when repairing demo data again', async () => {
    const links = source.getRepository(TourDestination);
    const link = await links.findOneByOrFail({ tourId: tours.get('DEMO-HL')!.id });
    await links.update({ tourId: link.tourId, destinationId: link.destinationId }, { sortOrder: 9 });
    expect(await source.transaction(manager => seedDemoDestinations(manager))).toEqual({ destinationsCreated: 0, linksCreated: 0, toursLinked: 0 });
    expect((await links.findOneByOrFail({ tourId: link.tourId, destinationId: link.destinationId })).sortOrder).toBe(9);
  });
});
