import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, mockStore } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*, moms(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[API/meetings] Supabase error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, meetings: meetings || [] });
    }

    // Fallback to in-memory mock store
    const list = Array.from(mockStore.meetings.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const withMoms = list.map((m) => ({
      ...m,
      moms: mockStore.moms.has(m.id) ? [mockStore.moms.get(m.id)] : [],
    }));

    return NextResponse.json({ success: true, meetings: withMoms });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = body.title || `Meeting — ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const startedAt = body.startedAt || new Date().toISOString();

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          title,
          started_at: startedAt,
          status: 'recording',
          duration_seconds: 0,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, meeting: data });
    }

    // In-memory fallback
    const id = crypto.randomUUID();
    const meeting = {
      id,
      title,
      started_at: startedAt,
      status: 'recording',
      duration_seconds: 0,
      created_at: new Date().toISOString(),
    };

    mockStore.meetings.set(id, meeting);
    mockStore.transcriptChunks.set(id, []);

    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, durationSeconds, title } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (durationSeconds !== undefined) updates.duration_seconds = durationSeconds;
    if (title !== undefined) updates.title = title;
    if (status === 'completed' || status === 'failed') updates.ended_at = new Date().toISOString();

    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, meeting: data });
    }

    // Mock store
    const existing = mockStore.meetings.get(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }

    const updated = { ...existing, ...updates };
    mockStore.meetings.set(id, updated);

    return NextResponse.json({ success: true, meeting: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
