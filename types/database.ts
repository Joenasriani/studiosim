export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: 'foundation' | 'intermediate' | 'advanced';
  published: boolean;
  created_at: string;
  access_mode?: 'free' | 'paid';
  stripe_price_id?: string | null;
  price_label?: string;
  preview_lessons?: number;
  marketplace_status?: 'platform_published' | 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'rejected';
  creator_id?: string | null;
  category_slug?: string | null;
  marketplace_summary?: string | null;
  reviewer_note?: string | null;
};


export type CourseCategory = {
  slug: string;
  title: string;
  description: string;
  sort_order: number;
  published: boolean;
};

export type CreatorApplication = {
  id: string;
  user_id: string;
  display_name: string;
  specialty: string;
  portfolio_url: string;
  proposal: string;
  status: 'submitted' | 'approved' | 'changes_requested' | 'rejected';
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorSubmission = {
  id: string;
  creator_id: string;
  course_id: string;
  category_slug: string;
  submission_title: string;
  submission_note: string;
  review_status: 'submitted' | 'approved' | 'changes_requested' | 'rejected';
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type CourseReview = {
  id: string;
  course_id: string;
  reviewer_id: string;
  rating: number;
  review_text: string;
  created_at: string;
};

export type Lesson = {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  objective: string;
  order_index: number;
  lesson_schema: LessonSchema;
  published: boolean;
  created_at: string;
};


export type CourseAccess = {
  id: string;
  user_id: string;
  course_id: string;
  source: string;
  active: boolean;
  stripe_checkout_session_id: string | null;
  granted_at: string;
  expires_at: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  seat_limit: number;
  subscription_status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member';
  created_at: string;
};

export type AnalyticsEvent = {
  id: string;
  user_id: string | null;
  event_name: string;
  course_id: string | null;
  lesson_id: string | null;
  properties: Json;
  created_at: string;
};


export type AiTutorEvent = {
  id: string;
  user_id: string;
  lesson_id: string;
  model_used: string;
  score_snapshot: number;
  request_snapshot: Json;
  response_snapshot: Json;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_review' | 'resolved';
  created_at: string;
  updated_at: string;
};

export type LearnerProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number;
  attempts: number;
  last_state: Json;
  completed_at: string | null;
  updated_at: string;
};

export type EaseType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'overshoot';

export type LessonControlId = 'duration' | 'ease' | 'overshoot' | 'anticipation' | 'settleHold';

export type LessonControl =
  | {
      id: Exclude<LessonControlId, 'ease'>;
      label: string;
      unit?: string;
      min: number;
      max: number;
      step: number;
      default: number;
    }
  | {
      id: 'ease';
      label: string;
      default: EaseType;
      options: EaseType[];
    };

export type MetricTarget = {
  id: LessonControlId;
  label: string;
  target: number | EaseType;
  tolerance: number;
  weight: number;
};

export type FeedbackRule = {
  metricId: LessonControlId;
  when: 'below' | 'above' | 'mismatch';
  message: string;
};

export type HintRule = {
  minScore: number;
  maxScore: number;
  title: string;
  message: string;
};

export type AssessmentCheck = {
  id: string;
  label: string;
  required: boolean;
};

export type LessonSchema = {
  version: '1.2';
  kind: 'motion_design_sandbox';
  scene: {
    studioName: string;
    cameraPosition: [number, number, number];
    targetPosition: [number, number, number];
    accent: string;
    environmentMood: string;
  };
  briefing: {
    principle: string;
    scenario: string;
    productionContext: string;
    passCondition: string;
  };
  controls: LessonControl[];
  assessment: {
    type: 'deterministic_rubric';
    passScore: number;
    metrics: MetricTarget[];
    reflectionPrompt: string;
    checks: AssessmentCheck[];
  };
  hints: HintRule[];
  feedback: {
    success: string;
    rules: FeedbackRule[];
    fallback: string;
  };
};
