'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AudioRecorder from '@/components/AudioRecorder';
import MeetingCard from '@/components/MeetingCard';
import { Clock, ShieldCheck, Languages, Zap, FileText } from 'lucide-react';
import type { Meeting } from '@/types';

export default function HomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Fetch meeting history
  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMeetings(data.meetings || []);
        }
      }
    } catch (err) {
      console.warn('Could not load meetings:', err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleDeleteMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-100">
      <Navbar wakeLockActive={wakeLockActive} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>AI Meeting Assistant for India &amp; Global Teams</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Never take manual notes again.
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-2 max-w-xl mx-auto">
            Tap Start, talk naturally in Hindi, Marathi, English, or Hinglish, tap Stop. Minto
            extracts every decision, action item, owner, and deadline with dual-pass accuracy audit.
          </p>
        </div>

        {/* Master Recorder & Start/Stop Button */}
        <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 sm:p-10 mb-12">
          <AudioRecorder
            onMeetingCreated={(newMeeting) => {
              setMeetings((prev) => [newMeeting, ...prev]);
            }}
            onWakeLockChange={setWakeLockActive}
          />
        </div>

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Mixed Language STT
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Auto-detects Hindi, Marathi, English, and code-switched dialogues seamlessly.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Dual-Pass Accuracy
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Pass 1 extracts deep minutes; Pass 2 audits against speech to eliminate omissions.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Long Meeting Ready
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Continuous 30s chunking handles 2 to 12+ hour meetings without RAM bloat.
              </p>
            </div>
          </div>
        </div>

        {/* Meeting History Section */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">Your Meetings</h2>
              <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {meetings.length}
              </span>
            </div>
          </div>

          {loadingMeetings ? (
            <div className="py-12 text-center text-sm text-zinc-400">Loading your meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                No meetings recorded yet.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Tap the big START button above to record your first meeting.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onDelete={handleDeleteMeeting}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400">
        <p>
          Minto — Open Source, Free-Tier AI Architecture. Powered by Deepgram Nova-3 &amp; Gemini.
        </p>
      </footer>
    </div>
  );
}
