'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import RecordButton from './RecordButton';
import LiveTranscript, { LiveChunk } from './LiveTranscript';
import { AudioMeter, ScreenWakeLockManager } from '@/lib/audio-utils';
import { saveOfflineChunk, getPendingChunksForMeeting, removeOfflineChunk } from '@/lib/offline-db';

interface AudioRecorderProps {
  onMeetingCreated?: (meeting: any) => void;
  onWakeLockChange?: (active: boolean) => void;
}

export default function AudioRecorder({
  onMeetingCreated,
  onWakeLockChange,
}: AudioRecorderProps) {
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [chunks, setChunks] = useState<LiveChunk[]>([]);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  // References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioMeterRef = useRef<AudioMeter | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockManager | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkCycleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const meetingIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const collectedChunksRef = useRef<LiveChunk[]>([]);
  const pendingUploadsRef = useRef<Promise<any>[]>([]);

  // Initialize WakeLock
  useEffect(() => {
    wakeLockRef.current = new ScreenWakeLockManager();
    return () => {
      stopAllHardware();
    };
  }, []);

  // Guard against accidental tab close or page reload while recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  // Automatically flush offline chunks as soon as network reconnects
  useEffect(() => {
    const handleOnline = async () => {
      if (meetingIdRef.current) {
        try {
          const pending = await getPendingChunksForMeeting(meetingIdRef.current);
          for (const item of pending) {
            if (item.id !== undefined) {
              await uploadChunk(item.blob, meetingIdRef.current, item.chunkIndex, item.startTime, item.endTime);
              await removeOfflineChunk(item.id);
            }
          }
        } catch (e) {
          console.warn('[Recorder] Online sync error:', e);
        }
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const stopAllHardware = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (chunkCycleIntervalRef.current) clearInterval(chunkCycleIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }

    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      onWakeLockChange?.(false);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Upload an audio chunk to /api/transcribe
  const uploadChunk = async (
    blob: Blob,
    activeMeetingId: string,
    index: number,
    startSec: number,
    endSec: number
  ) => {
    if (!blob || blob.size < 100) return;

    if (!navigator.onLine) {
      console.log('[Recorder] Offline: buffering chunk in IndexedDB', index);
      await saveOfflineChunk({
        meetingId: activeMeetingId,
        chunkIndex: index,
        blob,
        mimeType: blob.type || 'audio/webm',
        startTime: startSec,
        endTime: endSec,
        timestamp: Date.now(),
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('meetingId', activeMeetingId);
      formData.append('chunkIndex', index.toString());
      formData.append('startTime', startSec.toString());
      formData.append('endTime', endSec.toString());
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', blob, `chunk_${index}.${ext}`);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.text && data.text.trim().length > 0) {
          const newChunk: LiveChunk = {
            chunkIndex: index,
            text: data.text.trim(),
            speaker: data.speaker,
            language: data.language,
            startTime: startSec,
          };
          collectedChunksRef.current.push(newChunk);
          setChunks((prev) => [...prev, newChunk]);
        }
      }
    } catch (err) {
      console.warn('[Recorder] Chunk upload failed, saving offline:', err);
      await saveOfflineChunk({
        meetingId: activeMeetingId,
        chunkIndex: index,
        blob,
        mimeType: blob.type || 'audio/webm',
        startTime: startSec,
        endTime: endSec,
        timestamp: Date.now(),
      });
    }
  };

  // Start Meeting
  const handleStart = async () => {
    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Create Meeting record on backend
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startedAt: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!data.success || !data.meeting) {
        throw new Error(data.error || 'Failed to initialize meeting');
      }

      const newMeetingId = data.meeting.id;
      setMeetingId(newMeetingId);
      meetingIdRef.current = newMeetingId;
      onMeetingCreated?.(data.meeting);

      // 3. Audio Meter for dynamic visualizer
      const meter = new AudioMeter();
      meter.start(stream);
      audioMeterRef.current = meter;

      const updateMeter = () => {
        if (audioMeterRef.current) {
          setAudioLevel(audioMeterRef.current.getLevel());
          animFrameRef.current = requestAnimationFrame(updateMeter);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateMeter);

      // 4. Request Screen Wake Lock
      if (wakeLockRef.current) {
        const locked = await wakeLockRef.current.request();
        onWakeLockChange?.(locked);
      }

      // 5. Initialize Timer & Chunk store
      setDurationSeconds(0);
      setChunks([]);
      collectedChunksRef.current = [];
      pendingUploadsRef.current = [];
      chunkIndexRef.current = 0;
      startTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      // 6. Start MediaRecorder with 30-second cycles
      const startCycleRecorder = () => {
        const options: MediaRecorderOptions = {};
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        }

        const recorder = new MediaRecorder(stream, options);
        let cycleChunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            cycleChunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          if (cycleChunks.length > 0 && meetingIdRef.current) {
            const combinedBlob = new Blob(cycleChunks, { type: recorder.mimeType });
            const currentIndex = chunkIndexRef.current;
            chunkIndexRef.current += 1;
            const startSec = currentIndex * 30;
            const endSec = startSec + 30;

            const uploadPromise = uploadChunk(combinedBlob, meetingIdRef.current, currentIndex, startSec, endSec);
            pendingUploadsRef.current.push(uploadPromise);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
      };

      startCycleRecorder();

      // Cycle recorder every 30 seconds
      chunkCycleIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          startCycleRecorder();
        }
      }, 30000);

      setIsRecording(true);
    } catch (err: any) {
      console.error('[AudioRecorder] Could not start meeting:', err);
      let message = err.message || 'Check microphone permissions';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser settings to record meetings.';
      } else if (err.name === 'NotFoundError') {
        message = 'No microphone device found. Please connect a mic or headset.';
      }
      alert(message);
      stopAllHardware();
    }
  };

  // Stop Meeting and Trigger MOM Generation
  const handleStop = async () => {
    if (!meetingIdRef.current || isProcessing) return;
    const activeId = meetingIdRef.current;
    const finalDuration = durationSeconds;

    setIsRecording(false);
    setIsProcessing(true);

    // 1. Stop UI intervals and wake lock
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (chunkCycleIntervalRef.current) clearInterval(chunkCycleIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      onWakeLockChange?.(false);
    }

    // 2. Stop active recorder and await its onstop handler to flush the final audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      await new Promise<void>((resolve) => {
        const rec = mediaRecorderRef.current;
        if (!rec) return resolve();
        rec.addEventListener('stop', () => resolve(), { once: true });
        try {
          rec.stop();
        } catch (e) {
          resolve();
        }
      });
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 3. Await all pending audio uploads
    await Promise.all(pendingUploadsRef.current);

    try {
      // 4. Flush any pending offline chunks from IndexedDB
      const pending = await getPendingChunksForMeeting(activeId);
      for (const item of pending) {
        if (item.id !== undefined) {
          await uploadChunk(item.blob, activeId, item.chunkIndex, item.startTime, item.endTime);
          await removeOfflineChunk(item.id);
        }
      }

      // 5. Update meeting duration
      await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeId,
          durationSeconds: finalDuration,
          status: 'processing',
        }),
      });

      // 6. Trigger MOM generation passing clientChunks for resilient serverless execution
      const momRes = await fetch('/api/generate-mom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: activeId,
          clientChunks: collectedChunksRef.current,
          meetingMetadata: {
            title: `Meeting — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            durationSeconds: finalDuration,
            startedAt: new Date(startTimeRef.current).toISOString(),
          },
        }),
      });

      const momData = await momRes.json();

      if (!momData.success) {
        throw new Error(momData.error || 'Failed to generate MOM');
      }

      // 7. Store in sessionStorage as client-side backup
      if (typeof window !== 'undefined' && momData.mom) {
        sessionStorage.setItem(`minto_mom_${activeId}`, JSON.stringify(momData.mom));
        sessionStorage.setItem(`minto_chunks_${activeId}`, JSON.stringify(collectedChunksRef.current));
      }

      // 8. Navigate to the generated MOM page
      router.push(`/meetings/${activeId}`);
    } catch (err: any) {
      console.error('[AudioRecorder] Error completing meeting:', err);
      alert(`Error generating MOM: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <RecordButton
        isRecording={isRecording}
        isProcessing={isProcessing}
        durationSeconds={durationSeconds}
        audioLevel={audioLevel}
        chunkCount={chunks.length}
        onStart={handleStart}
        onStop={handleStop}
      />

      {isRecording && <LiveTranscript chunks={chunks} isRecording={isRecording} />}
    </div>
  );
}
