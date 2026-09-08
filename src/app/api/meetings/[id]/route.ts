import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, mockStore } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (meetingError || !meeting) {
        return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
      }

      const { data: chunks } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('meeting_id', id)
        .order('chunk_index', { ascending: true });

      const { data: mom } = await supabase
        .from('moms')
        .select('*')
        .eq('meeting_id', id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        meeting,
        chunks: chunks || [],
        mom: mom || null,
      });
    }

    // Mock store
    const meeting = mockStore.meetings.get(id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const chunks = mockStore.transcriptChunks.get(id) || [];
    const mom = mockStore.moms.get(id) || null;

    return NextResponse.json({
      success: true,
      meeting,
      chunks,
      mom,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    mockStore.meetings.delete(id);
    mockStore.transcriptChunks.delete(id);
    mockStore.moms.delete(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
