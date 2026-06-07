"use client";

import { useState, useCallback } from "react";
import type { PredictionResult } from "@/types";
import { api } from "@/lib/api";

interface UseUploadReturn {
  upload: (file: File, filename?: string) => Promise<void>;
  result: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, filename?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.predict.upload(file, filename);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    upload,
    result,
    isLoading,
    error,
    reset,
  };
}
