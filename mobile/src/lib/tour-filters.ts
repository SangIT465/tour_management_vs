export const filterKeys = ['search', 'destination', 'departureCity', 'minPrice', 'maxPrice', 'minDays', 'maxDays', 'categoryId'] as const;
export type TourFilters = Record<typeof filterKeys[number], string>;
export const sortOptions = [
  { label: 'Mới nhất', value: 'createdAt:DESC' }, { label: 'Đánh giá cao', value: 'avgRating:DESC' },
  { label: 'Tên A–Z', value: 'name:ASC' }, { label: 'Giá thấp đến cao', value: 'price:ASC' },
  { label: 'Giá cao đến thấp', value: 'price:DESC' }, { label: 'Ngắn ngày trước', value: 'durationDays:ASC' }, { label: 'Dài ngày trước', value: 'durationDays:DESC' },
];

export function readTourFilters(params: Record<string, string | string[] | undefined>): TourFilters {
  return Object.fromEntries(filterKeys.map(key => [key, typeof params[key] === 'string' ? params[key].trim() : ''])) as TourFilters;
}

export function validateTourFilters(filters: TourFilters): string {
  for (const [min, max, label, floor, ceiling] of [['minPrice', 'maxPrice', 'Giá', 0, Number.MAX_SAFE_INTEGER], ['minDays', 'maxDays', 'Số ngày', 1, 365]] as const) {
    for (const key of [min, max]) {
      if (filters[key] && (!/^\d+$/.test(filters[key]) || !Number.isSafeInteger(Number(filters[key])) || Number(filters[key]) < floor || Number(filters[key]) > ceiling)) return `${label} cần là số nguyên ${floor === 1 ? 'từ 1 đến 365' : 'không âm'}.`;
    }
    if (filters[min] && filters[max] && Number(filters[min]) > Number(filters[max])) return `${label} tối thiểu không được lớn hơn tối đa.`;
  }
  return '';
}
