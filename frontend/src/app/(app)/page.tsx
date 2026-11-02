"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUpload } from "@/hooks/useUpload";
import { getGreeting, getGenreImage } from "@/lib/auth";
import { formatBytes } from "@/lib/utils";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function HomePage() {
  const { upload, result, isLoading, error, reset } = useUpload();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const pickFile = (picked: File) => {
    if (picked.size > MAX_FILE_SIZE) {
      setFileError("File too large. Max 50MB.");
      return;
    }
    setFileError(null);
    setFile(picked);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dt = e.dataTransfer;
    const files = dt.files;
    if (files?.[0]) {
      pickFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) pickFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setFileError(null);
    try {
      await upload(file);
    } catch (err) {
      logger.error({ err }, "upload failed");
    }
  };

  const handleReset = () => {
    reset();
    setFileError(null);
    setFile(null);
  };

  const genreEntries = result
    ? Object.entries(result.all_scores).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 font-display text-3xl font-extrabold text-text">
          Good {getGreeting()}
        </h1>
        <p className="text-muted">Hear what you&apos;re made of.</p>
      </div>

      <Card className="mx-auto mb-8 max-w-2xl">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? "scale-[1.02] border-accent bg-accent/5"
              : "border-border hover:border-muted"
          }`}
        >
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileInput}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />

          {!file ? (
            <div>
              <p className="mb-2 font-display font-semibold text-text">
                Drop an audio file or click to browse
              </p>
              <p className="text-sm text-muted">MP3, WAV, FLAC, OGG up to 50MB</p>
            </div>
          ) : (
            <div>
              <p className="mb-1 font-display font-semibold text-text">{file.name}</p>
              <p className="text-sm text-muted">{formatBytes(file.size)}</p>
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

        {(fileError ?? error) && (
          <p role="alert" className="mt-4 text-center text-sm text-error">
            {fileError ?? error}
          </p>
        )}
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="mx-auto max-w-2xl"
          >
            <Card>
              <div className="mb-6">
                <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden rounded-t-lg">
                  {result.spotify_match?.album_art_url ? (
                    <Image
                      src={result.spotify_match.album_art_url}
                      alt={result.spotify_match.album}
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="object-cover"
                    />
                  ) : (
                    <Image
                      src={getGenreImage(result.genre)}
                      alt={result.genre}
                      fill
                      sizes="(max-width: 672px) 100vw, 672px"
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                </div>

                <h2 className="font-display text-3xl font-extrabold text-text">
                  {result.genre.charAt(0).toUpperCase() + result.genre.slice(1)}
                </h2>
                <p className="mb-2 font-display text-xl font-bold text-accent">
                  {Math.round(result.confidence * 100)}% confidence
                </p>

                {result.spotify_match ? (
                  <p className="text-sm text-muted">
                    {result.spotify_match.artist} · {result.spotify_match.album}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No match found via Spotify</p>
                )}
              </div>

              <div className="mb-6 space-y-3">
                {genreEntries.map(([genre, score], index) => {
                  const percentage = Math.round(score * 100);
                  return (
                    <motion.div
                      key={genre}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.05 }}
                      className="h-2 overflow-hidden rounded-full"
                    >
                      <div
                        className={`h-full ${
                          index === 0 ? "bg-accent" : index === 1 ? "bg-accent-dim" : "bg-[#333]"
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
