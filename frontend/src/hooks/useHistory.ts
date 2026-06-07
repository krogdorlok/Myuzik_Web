"use client";

import { useState, useCallback, useEffect } from "react";
import type { HistoryResponse, HistoryItem } from "@/types";
import { api } from "@/lib/api";

interface UseHistoryReturn {
  items: HistoryItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  fetch: (params?: { genre?: string; limit?: number; offset?: number }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  reset: () => void;
}

export function useHistory(): UseHistoryReturn {
  const [data, setData] = useState<HistoryResponse>({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: { genre?: string; limit?: number; offset?: number }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.history.list(params);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.history.delete(id);
      setData((prev) => ({
        items: prev.items.filter((item) => item.id !== id),
        total: prev.total - 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData({ items: [], total: 0 });
    setError(null);
  }, []);

  return {
    items: data.items,
    total: data.total,
    isLoading,
    error,
    fetch,
    deleteItem,
    reset,
  };
}
