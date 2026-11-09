import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDate, isValidBirthday, localDate, safeNext, date, money } from '../src/lib/format.ts';

test('validates birthdays without silently accepting calendar rollovers', () => {
  assert.equal(isValidDate('2024-02-29'), true); assert.equal(isValidDate('2025-02-29'), false);
  assert.equal(isValidDate('2026-13-01'), false); assert.equal(isValidDate('08/11/2026'), false);
  assert.equal(date('2026-11-08'), '08/11/2026');
});
test('preserves safe login continuations and rejects external links', () => {
  assert.equal(safeNext('/booking/tour-id?scheduleId=abc'), '/booking/tour-id?scheduleId=abc');
  for (const value of ['https://evil.test', '//evil.test', '/login', '/admin', '/tours\\evil']) assert.equal(safeNext(value), '/(tabs)');
});
test('distinguishes free and unavailable prices', () => {
  assert.match(money(0), /0/); assert.equal(money(null), 'Đang cập nhật');
});
test('validates birthdays independently of locale date formatting and UTC day changes', () => {
  const today = localDate(new Date(2026, 10, 9, 0, 5));
  assert.equal(today, '2026-11-09');
  assert.equal(isValidBirthday('2026-11-09', today), true);
  for (const value of ['2026-11-10', '1899-12-31', '2025-02-29', '']) assert.equal(isValidBirthday(value, today), false);
  assert.equal(isValidBirthday('1900-01-01', today), true);
});
