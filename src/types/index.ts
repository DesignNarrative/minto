export type MeetingStatus = 'recording' | 'processing' | 'completed' | 'failed';

export interface Meeting {
  id: string;
  user_id?: string | null;
  title: string;
  started_at: string;
  ended_at?: string | null;
  status: MeetingStatus;
  duration_seconds: number;
  language_detected?: string | null;
  created_at: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number | null;
}

export interface TranscriptChunk {
  id: string;
  meeting_id: string;
  chunk_index: number;
  text: string;
  speaker?: string | null;
  language?: string | null;
  start_time: number;
  end_time: number;
  confidence?: number;
  created_at: string;
}

export interface ActionItem {
  id?: number | string;
  action: string;
  owner: string;
  deadline: string;
  priority?: 'High' | 'Medium' | 'Low' | string;
  status?: string;
  notes?: string;
}

export interface DecisionItem {
  id?: number | string;
  decision: string;
  decidedBy?: string;
  context?: string;
}

export interface StructuredMomData {
  summary?: string;
  participants?: string[];
  meetingType?: string;
  duration?: string;
  date?: string;
  decisions?: DecisionItem[];
  actionItems?: ActionItem[];
  deadlines?: Array<{ date: string; task: string; owner?: string; context?: string }>;
  discussions?: Array<{ topic: string; raisedBy?: string; points: string[]; outcome?: string }>;
  disagreements?: Array<{ concern: string; raisedBy?: string; response?: string; resolution?: string }>;
  numbersAndBudgets?: Array<{ item: string; value: string; context?: string }>;
  suggestions?: Array<{ suggestion: string; by?: string; status?: string }>;
  unresolvedIssues?: string[];
  references?: string[];
  commitments?: Array<{ commitment: string; by?: string; to?: string; when?: string }>;
  risks?: string[];
  decisionChanges?: Array<{ original: string; changedTo: string; reason?: string }>;
}

export interface Mom {
  id: string;
  meeting_id: string;
  content: string; // Markdown formatted full MOM
  structured_data?: StructuredMomData | null;
  model_used: string;
  audit_passed?: boolean;
  audit_corrections?: string | null;
  created_at: string;
}

export interface AudioRecordingStats {
  durationSeconds: number;
  chunkCount: number;
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: number; // 0 to 100 for visualizer
  isOffline: boolean;
  pendingUploadCount: number;
}
