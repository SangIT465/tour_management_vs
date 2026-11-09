import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '../lib/api';

/** Abort previous reads and refresh when returning from another screen. */
export function useResource<T>(path: string | null) {
  const [state, setState] = useState<{ key: string | null; revision: number; data: T | null; error: string }>({ key: null, revision: -1, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api.request<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ key: path, revision, data, error: '' });
    }).catch(failure => {
      if (!controller.signal.aborted) setState(previous => ({ key: path, revision, data: previous.key === path ? previous.data : null, error: failure instanceof Error ? failure.message : 'Không tải được dữ liệu.' }));
    });
    return () => controller.abort();
  }, [path, revision]);
  const pending = !!path && (state.key !== path || state.revision !== revision);
  return { data: state.key === path ? state.data : null, loading: pending, error: state.key === path && !pending ? state.error : '', refresh };
}
