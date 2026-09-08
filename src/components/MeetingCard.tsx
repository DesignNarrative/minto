'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, FileText, ChevronRight, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { formatFriendlyDate, formatDuration } from '@/lib/audio-utils';
import type { Meeting } from '@/types';

interface MeetingCardProps {
  meeting: Meeting;
  onDelete?: (id: string) => void;
}

export default function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const isCompleted = meeting.status === 'completed';
  const isProcessing = meeting.status === 'processing';

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-4">
      <Link href={`/meetings/${meeting.id}`} className="flex-1 min-w-0 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <FileText className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              {meeting.title}
            </h3>
            {isProcessing && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing</span>
              </span>
            )}
            {isCompleted && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3" />
                <span>MOM Ready</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatFriendlyDate(meeting.started_at)}
            </span>
            {meeting.duration_seconds > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(meeting.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm('Delete this meeting and its MOM?')) {
                onDelete(meeting.id);
              }
            }}
            title="Delete meeting"
            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <Link
          href={`/meetings/${meeting.id}`}
          className="p-2 rounded-lg text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
