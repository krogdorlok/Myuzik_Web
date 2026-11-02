"use client";
// Paged, filterable history. A generation counter drops responses from superseded queries; deletes are
// optimistic and always reconcile by refetching the current page.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { HistoryResponse } from "@/types";

export const PAGE_SIZE = 10;

export function useHistory(genre: string | undefined, page: number) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const id = ++generation.current;
    setError(null);
    try {
      const result = await api.history({ genre, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (id === generation.current) setData(result);
    } catch (err) {
      if (id === generation.current)
        setError(err instanceof ApiError ? err.message : "Couldn't load your history.");
    }
  }, [genre, page]);

  useEffect(() => {
    setData(null);
    void load();
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      setData((d) => d && { items: d.items.filter((i) => i.id !== id), total: d.total - 1 });
      let failure: string | null = null;
      try {
        await api.deletePrediction(id);
      } catch (err) {
        failure = err instanceof ApiError ? err.message : "Couldn't delete that item.";
      }
      await load();
      if (failure) setError(failure);
    },
    [load],
  );

  return { data, error, remove, retry: load };
}
