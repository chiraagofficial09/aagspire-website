export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Reads ?page=&limit= from a request query. Returns null when no page is requested, so list
 * endpoints keep returning the full list to existing callers (dropdowns, exports).
 */
export function parsePagination(
  query: Record<string, unknown>,
  { defaultLimit = 25, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {}
): PageRequest | null {
  if (query.page === undefined) return null;
  const toInt = (value: unknown, fallback: number) => {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
    return Number.isFinite(n) ? n : fallback;
  };
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(maxLimit, Math.max(1, toInt(query.limit, defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta({ page, limit }: PageRequest, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escapes user input for a literal, case-insensitive match inside a MongoDB $regex. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Trimmed search text from a query value, or '' when absent or not a plain string. */
export function searchTerm(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}
