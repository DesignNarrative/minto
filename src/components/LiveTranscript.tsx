'use client';

import React, { useEffect, useRef } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { formatDuration } from '@/lib/audio-utils';

export interface LiveChunk {
  chunkIndex: number;
  text: string;
  speaker?: string;
  language?: string;
  startTime?: number;
}

interface LiveTranscriptProps {
  chunks: LiveChunk[];
  isRecording: boolean;
}

export default function LiveTranscript({ chunks, isRecording }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [chunks]);

  if (chunks.length === 0 && !isRecording) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <MessageSquare className="w-4 h-4 text-rose-500" />
          <span>Live Speech Stream</span>
          <span className="text-zinc-400 font-normal">({chunks.length} chunks)</span>
        </div>

        {isRecording && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Listening...</span>
          </div>
        )}
      </div>

      {/* Transcript Items */}
      <div
        ref={containerRef}
        className="p-4 space-y-3 max-h-64 sm:max-h-80 overflow-y-auto scroll-smooth text-sm"
      >
        {chunks.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 dark:text-zinc-600 italic">
            Audio chunks are sent every 30 seconds. Your speech will stream here automatically.
          </div>
        ) : (
          chunks.map((c) => (
            <div
              key={c.chunkIndex}
              className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1 transition-all"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {c.speaker || 'Speaker'}
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  {c.language && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 uppercase font-mono">
                      {c.language}
                    </span>
                  )}
                  {c.startTime !== undefined && (
                    <span className="font-mono text-zinc-400">{formatDuration(c.startTime)}</span>
                  )}
                </div>
              </div>
              <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{c.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
