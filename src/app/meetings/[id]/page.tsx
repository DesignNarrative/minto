'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MomDisplay from '@/components/MomDisplay';
import { ArrowLeft, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDuration } from '@/lib/audio-utils';

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const meetingId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<any>(null);
  const [mom, setMom] = useState<any>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setMeeting(data.meeting);
            setMom(data.mom);
            setChunks(data.chunks || []);
          }
        }
      } catch (err) {
        console.error('Failed to load meeting details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [meetingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
          <p className="text-sm text-zinc-500">Loading meeting minutes...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Meeting Not Found</h2>
          <p className="text-sm text-zinc-500 mb-4">
            This meeting may have been deleted or the link is invalid.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-semibold"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Meetings</span>
          </Link>
        </div>

        {/* MOM Display */}
        {mom ? (
          <MomDisplay
            content={mom.content}
            meetingTitle={meeting.title}
            startedAt={meeting.started_at}
            durationSeconds={meeting.duration_seconds}
            auditPassed={mom.audit_passed}
            auditCorrections={mom.audit_corrections}
            modelUsed={mom.model_used}
          />
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 text-center mb-8">
            <h3 className="text-lg font-bold mb-1">MOM is still processing</h3>
            <p className="text-xs text-zinc-500">
              The AI auditor is reviewing the speech transcript. Refresh in a few moments.
            </p>
          </div>
        )}

        {/* Raw Speech Transcript Accordion */}
        <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm mb-12">
          <button
            onClick={() => setShowTranscript((prev) => !prev)}
            className="w-full flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-200">
              <MessageSquare className="w-4 h-4 text-rose-500" />
              <span>Full Audio Transcript</span>
              <span className="text-xs font-normal text-zinc-400">
                ({chunks.length} recorded segments)
              </span>
            </div>
            {showTranscript ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          {showTranscript && (
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3 max-h-96 overflow-y-auto">
              {chunks.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No audio chunks available.</p>
              ) : (
                chunks.map((c) => (
                  <div
                    key={c.id || c.chunk_index}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-zinc-500 font-medium">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {c.speaker || 'Speaker'}
                      </span>
                      <span className="font-mono text-[10px]">
                        {formatDuration(Math.floor(c.start_time || 0))}
                      </span>
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
