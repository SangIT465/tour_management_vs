import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readTourFilters, validateTourFilters } from '../src/lib/tour-filters.ts';

test('preserves search, departure and category filters from the home screen', () => {
  const filters = readTourFilters({ search: ' Hội An ', departureCity: ' Đà Nẵng ', categoryId: 'beach', destination: 'Hội An', page: '3' });
  assert.equal(filters.search, 'Hội An');
  assert.equal(filters.departureCity, 'Đà Nẵng');
  assert.equal(filters.categoryId, 'beach');
  assert.equal(filters.destination, 'Hội An');
  assert.equal('page' in filters, false);
  assert.equal(validateTourFilters(filters), '');
});

test('ignores repeated route parameters rather than sending arrays to the API', () => {
  assert.equal(readTourFilters({ destination: ['Hội An', 'Sa Pa'] }).destination, '');
});

test('accepts zero price and inclusive duration limits', () => {
  assert.equal(validateTourFilters(readTourFilters({ minPrice: '0', maxPrice: '0', minDays: '1', maxDays: '365' })), '');
});

test('rejects reversed price and duration ranges', () => {
  assert.match(validateTourFilters(readTourFilters({ minPrice: '200', maxPrice: '100' })), /tối thiểu/);
  assert.match(validateTourFilters(readTourFilters({ minDays: '5', maxDays: '2' })), /tối thiểu/);
});

test('rejects invalid and unsafe numeric filters before requesting tours', () => {
  for (const params of [{ minPrice: '-1' }, { minPrice: '1.5' }, { minPrice: '1e3' }, { maxPrice: '9007199254740992' }, { minDays: '0' }, { maxDays: '366' }]) {
    assert.notEqual(validateTourFilters(readTourFilters(params)), '', JSON.stringify(params));
  }
});
