import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';

export type ListResult<T> = {
  data: T[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  filter: Record<string, string>;
  setFilter: (f: Record<string, string>) => void;
  sortKey: string;
  sortDir: 'asc' | 'desc';
  setSort: (key: string, dir?: 'asc' | 'desc') => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  refetch: () => void;
};

export function useCrudList<T extends { id: string }>(
  table: string,
  options: {
    pageSize?: number;
    searchFields?: string[];
    defaultSort?: { key: string; dir: 'asc' | 'desc' };
    defaultFilter?: Record<string, string>;
  } = {}
): ListResult<T> {
  const { session } = useAuth();
  const pageSize = options.pageSize ?? 10;
  const searchFields = options.searchFields ?? ['name', 'email', 'company'];
  const defaultSort = options.defaultSort ?? { key: 'created_at', dir: 'desc' };

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Record<string, string>>(options.defaultFilter ?? {});
  const [sortKey, setSortKey] = useState(defaultSort.key);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSort.dir);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.user) return;
      setLoading(true);
      setError(null);

      let query = supabase.from(table).select('*', { count: 'exact' }).eq('user_id', session.user.id);

      // Filter
      for (const [key, val] of Object.entries(filter)) {
        if (val && val !== 'All') {
          query = query.eq(key, val);
        }
      }

      // Search (OR across searchFields)
      if (search.trim()) {
        const orParts = searchFields.map((f) => `${f}.ilike.%${search.trim()}%`);
        query = query.or(orParts.join(','));
      }

      // Sort
      query = query.order(sortKey, { ascending: sortDir === 'asc' });

      // Pagination
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data: rows, error: err, count } = await query;
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setData([]);
        setTotal(0);
      } else {
        setData((rows ?? []) as T[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, table, page, pageSize, search, filter, sortKey, sortDir, refreshKey]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === data.length) return new Set();
      return new Set(data.map((d) => d.id));
    });
  }, [data]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const setSort = useCallback((key: string, dir?: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDir(dir ?? (key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'));
  }, [sortKey, sortDir]);

  return {
    data,
    total,
    loading,
    error,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    filter,
    setFilter,
    sortKey,
    sortDir,
    setSort,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    refetch
  };
}

export function useCrudMutation<T extends { id?: string }>(
  table: string,
  options: { onSuccess?: () => void } = {}
) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insert = useCallback(
    async (row: Partial<T>): Promise<{ error: string | null; data: T | null }> => {
      if (!session?.user) return { error: 'Not authenticated', data: null };
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...row, user_id: session.user.id })
        .select()
        .maybeSingle();
      setLoading(false);
      if (err) {
        setError(err.message);
        return { error: err.message, data: null };
      }
      options.onSuccess?.();
      return { error: null, data: data as T };
    },
    [session, table, options]
  );

  const update = useCallback(
    async (id: string, row: Partial<T>): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: 'Not authenticated' };
      setLoading(true);
      setError(null);
      const { error: err } = await supabase.from(table).update(row).eq('id', id).eq('user_id', session.user.id);
      setLoading(false);
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      options.onSuccess?.();
      return { error: null };
    },
    [session, table, options]
  );

  const remove = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: 'Not authenticated' };
      setLoading(true);
      setError(null);
      const { error: err } = await supabase.from(table).delete().eq('id', id).eq('user_id', session.user.id);
      setLoading(false);
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      options.onSuccess?.();
      return { error: null };
    },
    [session, table, options]
  );

  const removeMany = useCallback(
    async (ids: string[]): Promise<{ error: string | null }> => {
      if (!session?.user) return { error: 'Not authenticated' };
      setLoading(true);
      setError(null);
      const { error: err } = await supabase.from(table).delete().in('id', ids).eq('user_id', session.user.id);
      setLoading(false);
      if (err) {
        setError(err.message);
        return { error: err.message };
      }
      options.onSuccess?.();
      return { error: null };
    },
    [session, table, options]
  );

  return { insert, update, remove, removeMany, loading, error };
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          if (v === null || v === undefined) return '';
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(',')
    )
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJson(filename: string, rows: unknown[]) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
