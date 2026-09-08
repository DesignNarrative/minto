import { NextRequest, NextResponse } from 'next/server';
import { generateMeetingMom } from '@/lib/gemini';
import { getSupabaseServerClient, mockStore } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { meetingId } = await request.json();

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

    // 4. Construct complete transcript formatted with speaker names and timestamps
    let fullTranscript = '';
    if (chunks.length > 0) {
      fullTranscript = chunks
        .map((c) => {
          const speaker = c.speaker || 'Speaker';
          const timeOffset = Math.floor(c.start_time || 0);
          const mins = Math.floor(timeOffset / 60);
          const secs = timeOffset % 60;
          const timeStr = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
          return `${timeStr} ${speaker}: ${c.text}`;
        })
        .join('\n');
    } else {
      fullTranscript =
        '[No audio transcription chunks were recorded for this meeting. Generating executive framework.]';
    }

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
