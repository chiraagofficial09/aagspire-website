import { useEffect, useMemo, useState } from 'react';
import type { PaginationInfo } from '../components/work/Pagination';

/**
 * Pages an already-loaded list in the browser. Returns to page 1 whenever `resetKey` changes
 * (e.g. a filter), and stays in range when the list shrinks.
 */
export function useClientPagination<T>(items: T[], perPage: number, resetKey: string) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * perPage, currentPage * perPage),
    [items, currentPage, perPage]
  );

  const pagination: PaginationInfo = { page: currentPage, limit: perPage, total: items.length, totalPages };
  return { pageItems, pagination, setPage };
}
