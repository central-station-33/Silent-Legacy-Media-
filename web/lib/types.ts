export type DraftPillar = "Pro" | "W" | "Proof";
export type DraftStatus = "Pending" | "Approved" | "Rejected";

export type Draft = {
  id: number;
  created_at: string;
  title: string;
  pillar: DraftPillar;
  body_content: string;
  x_thread_text: string | null;
  video_script: string | null;
  primary_source_url: string | null;
  subject_name: string | null;
  status: DraftStatus;
  rejection_reason: string | null;
  published_at: string | null;
};

export type StoryPillar = "pro" | "w" | "proof";
export type StoryStatus = "pending" | "approved" | "rejected";

export type ScoutResult = {
  subject?: string;
  sourceLinks?: string[];
  [key: string]: unknown;
};

export type VerifierResult = {
  approved?: boolean;
  confidence?: number;
  failedRules?: string[];
  editorNote?: string;
  [key: string]: unknown;
};

export type ContentResult = {
  blogPost?: { headline?: string; body?: string };
  xThread?: string[];
  videoScript?: unknown;
  [key: string]: unknown;
};

export type Story = {
  id: string;
  status: StoryStatus;
  pillar: StoryPillar;
  scout: ScoutResult | null;
  verifier: VerifierResult | null;
  content: ContentResult | null;
  editor_note: string | null;
  scheduled_publish_at: string | null;
  published_at: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};
