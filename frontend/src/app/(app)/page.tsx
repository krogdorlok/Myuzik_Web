"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUpload } from "@/hooks/useUpload";
import { getGreeting, getGenreImage } from "@/lib/auth";
import { formatBytes } from "@/lib/utils";
import type { PredictionResult } from "@/types";

export default function HomePage() {
  const { upload, result, isLoading, error, reset } = useUpload();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dt = e.dataTransfer;
    const files = dt.files;
    if (files?.[0]) {
      const droppedFile = files[0];
      if (droppedFile.size > 50 * 1024 * 1024) {
        alert("File too large. Max 50MB.");
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        alert("File too large. Max 50MB.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      await upload(file);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    reset();
    setFile(null);
  };

  const genreEntries = result
    ? Object.entries(result.all_scores).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-extrabold text-text mb-2">
          Good {getGreeting()}
        </h1>
        <p className="text-muted">Hear what you're made of.</p>
      </div>

      <Card className="max-w-2xl mx-auto mb-8">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            dragActive
              ? "border-accent bg-accent/5 scale-[1.02]"
              : "border-border hover:border-muted"
          }`}
        >
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {!file ? (
            <div>
              <p className="text-text font-display font-semibold mb-2">
                Drop an audio file or click to browse
              </p>
              <p className="text-muted text-sm">MP3, WAV, FLAC, OGG up to 50MB</p>
            </div>
          ) : (
            <div>
              <p className="text-text font-display font-semibold mb-1">{file.name}</p>
              <p className="text-muted text-sm">{formatBytes(file.size)}</p>
            </div>
          )}
        </div>

        {file && !result && (
          <div className="mt-4 flex justify-center">
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Analyse"}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-error text-sm">{error}</p>
        )}
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <Card>
              <div className="mb-6">
                <div className="relative h-40 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
                  {result.spotify_match?.album_art_url ? (
                    <img
                      src={result.spotify_match.album_art_url}
                      alt={result.spotify_match.album}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={getGenreImage(result.genre)}
                      alt={result.genre}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                </div>

                <h2 className="text-3xl font-display font-extrabold text-text">
                  {result.genre.charAt(0).toUpperCase() + result.genre.slice(1)}
                </h2>
                <p className="text-accent font-display font-bold text-xl mb-2">
                  {Math.round(result.confidence * 100)}% confidence
                </p>

                {result.spotify_match ? (
                  <p className="text-muted text-sm">
                    {result.spotify_match.artist} · {result.spotify_match.album}
                  </p>
                ) : (
                  <p className="text-muted text-sm">No match found via Spotify</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {genreEntries.map(([genre, score], index) => {
                  const percentage = Math.round(score * 100);
                  return (
                    <motion.div
                      key={genre}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.05 }}
                      className="h-2 rounded-full overflow-hidden"
                    >
                      <div
                        className={`h-full ${
                          index === 0
                            ? "bg-accent"
                            : index === 1
                            ? "bg-accent-dim"
                            : "bg-[#333]"
                        }`}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <Button onClick={handleReset} variant="primary">
                  Analyse another
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
