import { NextRequest, NextResponse } from 'next/server';
import { generateMeetingMom } from '@/lib/gemini';
import { getSupabaseServerClient, mockStore } from '@/lib/supabase-server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { meetingId, clientChunks, meetingMetadata } = await request.json();

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: 'meetingId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    let meeting: any = null;
    let chunks: any[] = [];

    if (supabase) {
      // 1. Mark meeting as processing
      await supabase
        .from('meetings')
        .update({ status: 'processing' })
        .eq('id', meetingId);

      // 2. Fetch meeting details
      const { data: meetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();
      meeting = meetingData;

      // 3. Fetch all transcript chunks in chronological order
      const { data: chunkData } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('chunk_index', { ascending: true });
      chunks = chunkData || [];
    } else {
      // Mock store
      const existing = mockStore.meetings.get(meetingId);
      if (existing) {
        existing.status = 'processing';
        mockStore.meetings.set(meetingId, existing);
        meeting = existing;
      }
      chunks = mockStore.transcriptChunks.get(meetingId) || [];
    }

    // If serverless memory had no chunks, use client-provided chunks from the browser session
    if (chunks.length === 0 && clientChunks && Array.isArray(clientChunks) && clientChunks.length > 0) {
      chunks = clientChunks;
    }

    if (!meeting && meetingMetadata) {
      meeting = meetingMetadata;
    }

    // 4. Check if actual speech was captured
    const speechChunks = chunks.filter((c) => c.text && c.text.trim().length > 0);
    const combinedSpeechText = speechChunks.map((c) => c.text.trim()).join(' ');

    if (speechChunks.length === 0 || combinedSpeechText.length === 0) {
      const durationFormatted = meeting?.duration_seconds
        ? `${Math.max(1, meeting.duration_seconds)} seconds`
        : 'brief period';

      const noSpeechMom = `## ⚠️ No Speech Detected

- **Meeting Title:** ${meeting?.title || 'Recording'}
- **Date:** ${new Date().toLocaleDateString()}
- **Duration Recorded:** ${durationFormatted}
- **Status:** Completed (No Speech Captured)

### Why is this empty?
No audible speech or spoken dialogue was detected during this recording session. 

**Tips for your next recording:**
1. Ensure your device microphone is permitted and not muted.
2. Speak clearly near the microphone in Hindi, Marathi, English, or mixed language.
3. Make sure your \`DEEPGRAM_API_KEY\` and \`GEMINI_API_KEY\` are configured in \`.env.local\`.`;

      // Save no-speech notice
      if (supabase) {
        await supabase.from('moms').insert({
          meeting_id: meetingId,
          content: noSpeechMom,
          model_used: 'system-validation',
          audit_passed: true,
        });
        await supabase.from('meetings').update({ status: 'completed' }).eq('id', meetingId);
      } else {
        mockStore.moms.set(meetingId, {
          id: crypto.randomUUID(),
          meeting_id: meetingId,
          content: noSpeechMom,
          model_used: 'system-validation',
          audit_passed: true,
          created_at: new Date().toISOString(),
        });
        if (meeting) {
          meeting.status = 'completed';
          mockStore.meetings.set(meetingId, meeting);
        }
      }

      return NextResponse.json({
        success: true,
        mom: {
          content: noSpeechMom,
          model_used: 'system-validation',
          audit_passed: true,
        },
      });
    }

    // 5. Construct complete transcript formatted with speaker names and timestamps
    const fullTranscript = speechChunks
      .map((c) => {
        const speaker = c.speaker || 'Speaker';
        const timeOffset = Math.floor(c.start_time || 0);
        const mins = Math.floor(timeOffset / 60);
        const secs = timeOffset % 60;
        const timeStr = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
        return `${timeStr} ${speaker}: ${c.text}`;
      })
      .join('\n');

    // 5. Generate MOM with Pass 1 (generation) + Pass 2 (auditor verification)
    const momResult = await generateMeetingMom(fullTranscript, {
      title: meeting?.title,
      durationSeconds: meeting?.duration_seconds,
      startedAt: meeting?.started_at,
    });

    // 6. Save MOM to database
    let savedMom: any = null;

    if (supabase) {
      const { data: momData, error: momError } = await supabase
        .from('moms')
        .insert({
          meeting_id: meetingId,
          content: momResult.content,
          model_used: momResult.modelUsed,
          audit_passed: momResult.auditPassed,
          audit_corrections: momResult.auditCorrections,
        })
        .select()
        .single();

      if (momError) {
        console.error('[API/generate-mom] Error saving MOM:', momError);
      }
      savedMom = momData;

      // Mark meeting as completed
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', meetingId);
    } else {
      // Mock store
      savedMom = {
        id: crypto.randomUUID(),
        meeting_id: meetingId,
        content: momResult.content,
        model_used: momResult.modelUsed,
        audit_passed: momResult.auditPassed,
        audit_corrections: momResult.auditCorrections,
        created_at: new Date().toISOString(),
      };
      mockStore.moms.set(meetingId, savedMom);

      if (meeting) {
        meeting.status = 'completed';
        meeting.ended_at = new Date().toISOString();
        mockStore.meetings.set(meetingId, meeting);
      }
    }

    return NextResponse.json({
      success: true,
      mom: savedMom || {
        content: momResult.content,
        model_used: momResult.modelUsed,
        audit_passed: momResult.auditPassed,
      },
    });
  } catch (err: any) {
    console.error('[API/generate-mom] Failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
