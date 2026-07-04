// ============================================================
// TAO Recruit AI — Shared TypeScript Types
// ============================================================

// ── User & Auth ──────────────────────────────────────────────

export type UserRole = "admin" | "recruiter" | "candidate";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface RecruiterProfile {
  id: string;
  user_id: string;
  department?: string;
  title?: string;
  phone?: string;
  created_at: string;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  phone?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  location?: string;
  created_at: string;
}

// ── Jobs ─────────────────────────────────────────────────────

export type JobStatus = "draft" | "published" | "archived" | "closed";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "executive";

/** A Nigeria deployment region: one state + one LGA */
export interface JobRegion {
  state: string;
  lga: string;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  department_id: string;
  department?: Department;
  employment_type: EmploymentType;
  experience_level: ExperienceLevel;
  location?: string;
  remote: boolean;
  salary_min?: number;
  salary_max?: number;
  description: string;
  responsibilities: string;
  requirements: string;
  skills_required: string[];
  regions: JobRegion[];
  status: JobStatus;
  application_deadline?: string;
  created_by: string;
  applicant_count?: number;
  created_at: string;
  updated_at: string;
}

// ── Applications ─────────────────────────────────────────────

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interview"
  | "evaluation"
  | "shortlisted"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  job_id: string;
  job?: Job;
  candidate_id: string;
  candidate?: UserProfile;
  status: ApplicationStatus;
  cover_letter?: string;
  resume_url?: string;
  portfolio_url?: string;
  created_at: string;
  updated_at: string;
}

// ── CV Analysis (legacy — cv_analyses table) ──────────────────

export interface CVAnalysis {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills: string[];
  education: CVEducation[];
  certifications: string[];
  work_experience: CVWorkExperience[];
  professional_summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  job_fit_score: number;
  raw_json: Record<string, unknown>;
  created_at: string;
}

export interface CVEducation {
  institution: string;
  degree: string;
  field?: string;
  graduation_year?: string;
}

export interface CVWorkExperience {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  description?: string;
}

// ── Candidate AI Analysis (new — candidate_ai_analysis table) ──

export interface CandidateAIWorkExperience {
  job_title: string;
  company: string;
  duration: string;
  responsibilities: string[];
}

export interface CandidateAIEducation {
  institution: string;
  degree: string;
  year: string;
}

export interface CandidateAIAnalysis {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  // CV Extraction
  extracted_text: string;
  extraction_status: "pending" | "success" | "failed" | "empty" | "unsupported";
  extraction_error?: string;
  // AI Analysis
  professional_summary: string;
  skills: string[];
  strengths: string[];
  risks: string[];
  years_of_experience: string;
  work_experience: CandidateAIWorkExperience[];
  education: CandidateAIEducation[];
  certifications: string[];
  recommended_role_fit: string;
  overall_score: number; // 0–100
  // Metadata
  ai_model: string;
  analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Interviews ────────────────────────────────────────────────

export type QuestionCategory = "technical" | "behavioral" | "situational" | "problem_solving";

export interface Interview {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  status: "pending" | "in_progress" | "completed";
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  category: QuestionCategory;
  question_text: string;
  order_index: number;
  is_follow_up: boolean;
  parent_question_id?: string;
}

export interface InterviewResponse {
  id: string;
  question_id: string;
  interview_id: string;
  response_text: string;
  responded_at: string;
}

// ── Evaluation ────────────────────────────────────────────────

export type Recommendation =
  | "highly_recommended"
  | "recommended"
  | "consider"
  | "not_recommended";

export interface Evaluation {
  id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  // Scores 0–100
  technical_score: number;
  communication_score: number;
  experience_score: number;
  problem_solving_score: number;
  culture_fit_score: number;
  overall_score: number;
  recommendation: Recommendation;
  recruiter_summary: string;
  ai_rationale: string;
  created_at: string;
}

// ── Utility ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
