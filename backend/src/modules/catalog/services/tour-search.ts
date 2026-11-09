/** Fold Vietnamese input consistently, including Đ/đ, which Unicode CI keeps distinct. */
export function normalizeTourSearch(value?: string): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .trim().replace(/\s+/g, ' ').toLowerCase();
}

export function tourSearchPattern(normalized: string): string {
  // A customer typing % or _ is searching for that character, not SQL wildcards.
  return `%${normalized.replace(/[!%_]/g, '!$&')}%`;
}

/** Only call with internal column/parameter names; all customer text stays parameterized. */
export function tourTextContains(column: string, parameter: string): string {
  return `REPLACE(LOWER(CONVERT(${column} USING utf8mb4)), 'đ', 'd') COLLATE utf8mb4_unicode_ci LIKE :${parameter} ESCAPE '!'`;
}
