import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioChunk } from '@/lib/deepgram';
import { getSupabaseServerClient, mockStore } from '@/lib/supabase-server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const meetingId = formData.get('meetingId') as string;
    const chunkIndexStr = formData.get('chunkIndex') as string;
    const startTimeStr = formData.get('startTime') as string;
    const endTimeStr = formData.get('endTime') as string;
    const audioFile = formData.get('file') as File | null;

    if (!meetingId || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Meeting ID and audio file are required' },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr || '0', 10);
    const startTime = parseFloat(startTimeStr || '0');
    const endTime = parseFloat(endTimeStr || '30');

    const language = (formData.get('language') as string) || 'auto';

    // Convert audio File to Buffer for Deepgram
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Deepgram Nova-3 API with dedicated language model
    const result = await transcribeAudioChunk(buffer, audioFile.type || 'audio/webm', language);

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('transcript_chunks')
        .insert({
          meeting_id: meetingId,
          chunk_index: chunkIndex,
          text: result.text,
          speaker: result.speaker,
          language: result.language,
          start_time: startTime,
          end_time: endTime,
          confidence: result.confidence,
          raw_response: result.rawResponse,
        })
        .select()
        .single();

      if (error) {
        console.error('[API/transcribe] Supabase insert error:', error);
      }
    } else {
      // Mock store
      const chunkRecord = {
        id: crypto.randomUUID(),
        meeting_id: meetingId,
        chunk_index: chunkIndex,
        text: result.text,
        speaker: result.speaker,
        language: result.language,
        start_time: startTime,
        end_time: endTime,
        confidence: result.confidence,
        created_at: new Date().toISOString(),
      };

      const existingChunks = mockStore.transcriptChunks.get(meetingId) || [];
      existingChunks.push(chunkRecord);
      mockStore.transcriptChunks.set(meetingId, existingChunks);
    }

    return NextResponse.json({
      success: true,
      chunkIndex,
      text: result.text,
      speaker: result.speaker,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (err: any) {
    console.error('[API/transcribe] Transcription error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
