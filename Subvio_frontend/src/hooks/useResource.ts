import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type Params } from '@/lib/api';
import type { Paged } from '@/types';

export function useList<T>(resource: string, params: Params = {}, enabled = true) {
  return useQuery({
    queryKey: [resource, params],
    queryFn: () => api.get<Paged<T>>(`/${resource}`, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** All records of a resource for use in select inputs. */
export function useOptions<T>(resource: string, enabled = true) {
  const query = useList<T>(resource, { pageSize: 500 }, enabled);
  return query.data?.data ?? [];
}

export function useItem<T>(resource: string, id: string | undefined) {
  return useQuery({
    queryKey: [resource, 'item', id],
    queryFn: () => api.get<T>(`/${resource}/${id}`),
    enabled: Boolean(id),
  });
}

interface ActionOptions<R, V> {
  success?: string | ((result: R, vars: V) => string);
  /** Query key prefixes to refetch on success. */
  invalidate?: string[];
  onSuccess?: (result: R) => void;
}

/** Mutation with toast feedback and cache invalidation. */
export function useAction<V = void, R = unknown>(fn: (vars: V) => Promise<R>, opts: ActionOptions<R, V> = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      opts.invalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(result, vars) : opts.success);
      opts.onSuccess?.(result);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Page, debounced search and status filter state for list pages (search seeded from ?search=). */
export function useTableState(pageSize = 10) {
  const [urlParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(urlParams.get('search') ?? '');
  const [debounced, setDebounced] = useState(search);
  const [status, setStatusState] = useState(urlParams.get('status') ?? '');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => ({ page, pageSize, search: debounced, status }), [page, pageSize, debounced, status]);
  const setStatus = (value: string) => {
    setStatusState(value);
    setPage(1);
  };
  return { page, setPage, search, setSearch, status, setStatus, params };
}
