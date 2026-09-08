'use client';

import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/audio-utils';

interface RecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  durationSeconds: number;
  audioLevel: number;
  chunkCount: number;
  onStart: () => void;
  onStop: () => void;
}

export default function RecordButton({
  isRecording,
  isProcessing,
  durationSeconds,
  audioLevel,
  chunkCount,
  onStart,
  onStop,
}: RecordButtonProps) {
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 shadow-xl mb-4">
          <Loader2 className="w-12 h-12 text-rose-600 dark:text-rose-400 animate-spin" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
          Generating Ultra-Detailed MOM...
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
          Transcribing speech, running Gemini extraction, and conducting accuracy audit...
        </p>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        {/* Timer & Chunk Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm font-semibold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-500" />
            <span>REC</span>
            <span className="font-mono text-base">{formatDuration(durationSeconds)}</span>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">
            {chunkCount} {chunkCount === 1 ? 'chunk' : 'chunks'} synced
          </div>
        </div>

        {/* Audio Level Visualizer */}
        <div className="flex items-center justify-center gap-1 h-10 mb-6 px-4">
          {[...Array(16)].map((_, i) => {
            // Dynamic bar height based on audioLevel and pseudo frequency spread
            const variance = Math.sin((i / 16) * Math.PI) * (audioLevel / 100);
            const heightPercent = Math.max(12, Math.min(100, variance * 100));
            return (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-red-500 to-amber-500 transition-all duration-75"
                style={{ height: `${heightPercent}%` }}
              />
            );
          })}
        </div>

        {/* Big Stop Button */}
        <button
          onClick={onStop}
          className="group relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Square className="w-6 h-6 fill-current text-red-500" />
          <span>STOP &amp; GENERATE MOM</span>
        </button>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Tap stop whenever your meeting is over. Deepgram &amp; Gemini will craft your full minutes.
        </p>
      </div>
    );
  }

  // Idle / Ready to Start
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative group mb-6">
        {/* Glowing pulse ring */}
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 opacity-70 blur-lg group-hover:opacity-100 transition-opacity animate-pulse" />

        {/* Giant Start Button */}
        <button
          onClick={onStart}
          aria-label="Start Meeting Recording"
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-amber-600 text-white flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Mic className="w-14 h-14 sm:w-16 sm:h-16 stroke-[2.2] mb-1" />
          <span className="font-extrabold text-base sm:text-lg tracking-wider">START</span>
          <span className="text-[10px] sm:text-xs font-medium opacity-90">TAP TO RECORD</span>
        </button>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-1">
        Ready to capture your meeting
      </h2>
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
        Works continuously for short or 6–12+ hour meetings. Automatically handles Hindi, Marathi,
        English, and code-switched Hinglish.
      </p>
    </div>
  );
}
