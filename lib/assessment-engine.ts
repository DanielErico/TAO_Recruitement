/**
 * TAO Recruit AI — Plan B: Role-Aware Assessment Question Engine
 * ====================================================================
 * Generates and caches position-tailored online recruitment assessments.
 *
 * Implements Sections A, B, C, and D:
 *   - Section A: Introduction and Motivation
 *   - Section B: Understanding of the Role & Responsibilities
 *   - Section C: Relevant Skills and Practical Experience
 *   - Section D: Role-Specific Problem-Solving & Realistic Work Scenarios
 *
 * Cohort Consistency:
 *   Questions are deterministically generated and cached per Job ID so that
 *   all candidates applying for the same position receive the same core assessment.
 * ====================================================================
 */

import { httpsPost, cleanJsonContent, PRIMARY_NVIDIA_MODEL, callGeminiWithFailover } from "./ai";

export interface AssessmentQuestion {
  id: string;
  section: "A" | "B" | "C" | "D";
  sectionTitle: string;
  questionNumber: number;
  questionText: string;
  type: "long_text" | "short_text" | "multiple_choice" | "scenario";
  options?: string[];
  placeholder?: string;
  helperText?: string;
  minLength?: number;
  recommendedWords?: number;
  required: boolean;
}

export interface RoleAssessmentSet {
  jobId: string;
  jobTitle: string;
  department: string;
  organisation: string;
  estimatedMinutes: number;
  instructions: string;
  questions: AssessmentQuestion[];
  generatedAt: string;
}

// In-memory cache for cohort consistency per job
const roleAssessmentCache = new Map<string, RoleAssessmentSet>();

export interface JobAssessmentContext {
  id: string;
  title: string;
  department?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  skills_required?: string[];
  organisation?: string;
}

/**
 * Retrieves or generates the role-aware online assessment for a specific job.
 * Ensures consistent questions across all applicants in the cohort.
 */
export async function getOrCreateRoleAssessment(job: JobAssessmentContext): Promise<RoleAssessmentSet> {
  const cacheKey = job.id;
  if (roleAssessmentCache.has(cacheKey)) {
    return roleAssessmentCache.get(cacheKey)!;
  }

  const orgName = job.organisation || "The Agriculture Option (TAO)";
  const deptName = job.department || "General Operations";
  const roleTitle = job.title;

  try {
    const generated = await generateAssessmentViaAI(job, orgName, deptName);
    roleAssessmentCache.set(cacheKey, generated);
    return generated;
  } catch (err: any) {
    console.warn(`[AssessmentEngine] AI question generation failed for "${roleTitle}", using built-in role template:`, err.message);
    const fallbackSet = buildDeterministicRoleAssessment(job, orgName, deptName);
    roleAssessmentCache.set(cacheKey, fallbackSet);
    return fallbackSet;
  }
}

/**
 * Uses LLM (Nemotron with Gemini fallback) to synthesize 6 tailored questions across Sections A-D
 */
async function generateAssessmentViaAI(
  job: JobAssessmentContext,
  orgName: string,
  deptName: string
): Promise<RoleAssessmentSet> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!apiKey && !geminiKey) {
    throw new Error("No AI API keys configured for assessment generation.");
  }

  const systemPrompt = `You are the lead Recruitment Assessment Architect for ${orgName}.
Your task is to design a structured, professional, 6-question online recruitment assessment specifically tailored for the position of "${job.title}" in the ${deptName} department.

The assessment must cover 4 distinct sections:
- Section A: Introduction and motivation (1 question)
- Section B: Understanding of the role and key duties (1 question)
- Section C: Relevant skills, past experience, and transferable achievements (2 questions)
- Section D: Role-specific practical scenarios and problem-solving (2 realistic situational questions reflecting actual challenges encountered in this exact role)

STRICT REQUIREMENTS:
1. Every question must be directly relevant to the actual responsibilities of "${job.title}". Do not use generic filler.
2. Section D questions must describe realistic workplace situations (e.g. handling a dispute, prioritising competing tasks, debugging an issue, improving low metrics) tailored specifically to this position.
3. Return ONLY a valid JSON object matching the schema below. No markdown fences, no explanatory text outside JSON.

JSON SCHEMA:
{
  "estimatedMinutes": 20,
  "instructions": "Please answer each question thoroughly based on your real experience, skills, and judgement. Your responses will be evaluated alongside your CV by the recruitment team.",
  "questions": [
    {
      "id": "q1",
      "section": "A",
      "sectionTitle": "Introduction & Motivation",
      "questionNumber": 1,
      "questionText": "Question text here...",
      "type": "long_text",
      "placeholder": "Briefly introduce your background and what motivated you to apply...",
      "helperText": "Explain your interest in this role and what attracted you to ${orgName}.",
      "minLength": 40,
      "recommendedWords": 80,
      "required": true
    },
    {
      "id": "q2",
      "section": "B",
      "sectionTitle": "Understanding of the Role",
      "questionNumber": 2,
      "questionText": "Question text here...",
      "type": "long_text",
      "placeholder": "Describe what you believe are the core responsibilities of this position...",
      "helperText": "Outline how your understanding aligns with the expectations of this role.",
      "minLength": 40,
      "recommendedWords": 100,
      "required": true
    },
    {
      "id": "q3",
      "section": "C",
      "sectionTitle": "Relevant Skills & Experience",
      "questionNumber": 3,
      "questionText": "Question text here...",
      "type": "long_text",
      "placeholder": "Highlight the specific skills or tools you bring...",
      "helperText": "Refer to practical tools, software, or methods relevant to ${job.title}.",
      "minLength": 40,
      "recommendedWords": 100,
      "required": true
    },
    {
      "id": "q4",
      "section": "C",
      "sectionTitle": "Relevant Skills & Experience",
      "questionNumber": 4,
      "questionText": "Question text here...",
      "type": "long_text",
      "placeholder": "Share a concrete example of a project or task you completed...",
      "helperText": "Describe the task, your personal contribution, and the outcome achieved.",
      "minLength": 50,
      "recommendedWords": 120,
      "required": true
    },
    {
      "id": "q5",
      "section": "D",
      "sectionTitle": "Role-Specific Problem Solving",
      "questionNumber": 5,
      "questionText": "Realistic workplace scenario 1 text here...",
      "type": "scenario",
      "placeholder": "Walk us through the steps you would take to resolve this situation...",
      "helperText": "Explain your reasoning, communication, and action plan.",
      "minLength": 60,
      "recommendedWords": 140,
      "required": true
    },
    {
      "id": "q6",
      "section": "D",
      "sectionTitle": "Role-Specific Problem Solving",
      "questionNumber": 6,
      "questionText": "Realistic workplace scenario 2 text here...",
      "type": "scenario",
      "placeholder": "Describe your approach to handling this challenge...",
      "helperText": "Focus on accountability, accuracy, and practical outcome.",
      "minLength": 60,
      "recommendedWords": 140,
      "required": true
    }
  ]
}`;

  const userPrompt = `Generate the official 6-question assessment for:
ROLE: ${job.title}
DEPARTMENT: ${deptName}
ORGANISATION: ${orgName}
JOB DESCRIPTION: ${job.description || "N/A"}
RESPONSIBILITIES: ${job.responsibilities || "N/A"}
REQUIREMENTS: ${job.requirements || "N/A"}
REQUIRED SKILLS: ${(job.skills_required || []).join(", ") || "General role skills"}`;

  let rawJson = "";

  if (apiKey) {
    try {
      const response = await httpsPost(
        "integrate.api.nvidia.com",
        "/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        JSON.stringify({
          model: PRIMARY_NVIDIA_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
        15000
      );
      const parsed = JSON.parse(response);
      rawJson = parsed.choices?.[0]?.message?.content || "";
    } catch (err: any) {
      console.warn("[AssessmentEngine] NVIDIA generation failed, attempting Gemini failover:", err.message);
    }
  }

  if (!rawJson && geminiKey) {
    rawJson = await callGeminiWithFailover(geminiKey, systemPrompt, userPrompt, true, 0.2);
  }

  if (!rawJson) {
    throw new Error("Failed to receive response from AI model.");
  }

  const cleaned = cleanJsonContent(rawJson);
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.questions) || parsed.questions.length < 4) {
    throw new Error("Invalid questions structure returned by AI.");
  }

  return {
    jobId: job.id,
    jobTitle: job.title,
    department: deptName,
    organisation: orgName,
    estimatedMinutes: parsed.estimatedMinutes || 20,
    instructions:
      parsed.instructions ||
      "Please complete each question thoughtfully. Your responses will be evaluated alongside your application and CV to support recruiter shortlisting.",
    questions: parsed.questions.map((q: any, idx: number) => ({
      id: q.id || `q${idx + 1}`,
      section: q.section || (idx === 0 ? "A" : idx === 1 ? "B" : idx < 4 ? "C" : "D"),
      sectionTitle: q.sectionTitle || getSectionTitle(q.section || (idx === 0 ? "A" : idx === 1 ? "B" : idx < 4 ? "C" : "D")),
      questionNumber: idx + 1,
      questionText: String(q.questionText || `Assessment question for ${job.title}`),
      type: q.type || "long_text",
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      placeholder: q.placeholder || "Type your response here...",
      helperText: q.helperText || undefined,
      minLength: typeof q.minLength === "number" ? q.minLength : 30,
      recommendedWords: typeof q.recommendedWords === "number" ? q.recommendedWords : 100,
      required: true,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function getSectionTitle(section: string): string {
  switch (section) {
    case "A":
      return "Introduction & Motivation";
    case "B":
      return "Understanding of the Role";
    case "C":
      return "Relevant Skills & Experience";
    case "D":
      return "Role-Specific Problem Solving";
    default:
      return "Assessment";
  }
}

/**
 * High-quality deterministic fallback template based on job title & details.
 * Ensures the candidate never experiences delays if external LLM APIs are offline.
 */
function buildDeterministicRoleAssessment(
  job: JobAssessmentContext,
  orgName: string,
  deptName: string
): RoleAssessmentSet {
  const title = job.title;
  const isRetail = /retail|sales|customer|store|cashier|clerk/i.test(title);
  const isDev = /developer|engineer|software|frontend|backend|tech/i.test(title);
  const isMarketing = /marketing|growth|content|social|campaign/i.test(title);
  const isFinance = /account|finance|audit|bookkeeper/i.test(title);
  const isAgric = /agric|farm|crop|livestock|field/i.test(title);

  // Scenario 1 & 2 tailored to role category
  let scenario1 = `Imagine you are working as a ${title} and receive two urgent requests with competing deadlines from different stakeholders. How would you investigate the requirements, prioritise your tasks, and communicate with those involved?`;
  let scenario2 = `Can you describe a situation where a key deliverable or procedure in your ${title} responsibilities failed or did not meet expectations shortly before a milestone? How would you identify the root cause, rectify the issue, and ensure it does not happen again?`;

  if (isRetail) {
    scenario1 = `A customer approaches the counter visibly upset, claiming they were shortchanged after their previous transaction and that a product price on the shelf does not match what was scanned. Walk through the exact steps you would take to resolve this dispute calmly, accurately, and professionally.`;
    scenario2 = `During a peak business hour, an essential item experiences a sudden inventory discrepancy, and multiple shoppers are requesting assistance simultaneously. How would you balance customer service, stock accuracy, and store policy under pressure?`;
  } else if (isDev) {
    scenario1 = `A critical feature fails automated regression tests shortly before a scheduled deployment. You have limited time before the release window closes. Detail your systematic debugging strategy, how you communicate with team members, and how you decide between rolling back or applying a hotfix.`;
    scenario2 = `You identify significant technical debt or inefficiency in an existing codebase or process that could impact system scalability. How would you explain this issue to non-technical stakeholders, propose an actionable refactoring plan, and measure success?`;
  } else if (isMarketing) {
    scenario1 = `A newly launched outreach campaign is receiving significantly lower engagement and conversion rates than projected after its first week. Walk us through the specific metrics you would analyse, how you would diagnose the bottleneck, and the corrective actions you would test.`;
    scenario2 = `You are tasked with promoting a new product or programme under tight budget constraints. Explain how you would identify the target demographic, structure key messaging, and measure return on effort.`;
  } else if (isAgric) {
    scenario1 = `Unexpected environmental conditions or supply delays threaten to disrupt a scheduled agricultural operation or seasonal yield. Describe the practical contingency steps you would assess, whom you would coordinate with, and how you would safeguard operational outcomes.`;
    scenario2 = `You notice inconsistency in operational records or field quality metrics submitted by team members. How would you verify the data, address the discrepancies constructively, and implement quality controls?`;
  }

  const questions: AssessmentQuestion[] = [
    {
      id: "q1",
      section: "A",
      sectionTitle: "Introduction & Motivation",
      questionNumber: 1,
      questionText: `Please introduce yourself briefly and explain what specific factors motivated you to apply for the ${title} position at ${orgName}.`,
      type: "long_text",
      placeholder: "Summarise your background, career goals, and what drew you to this opportunity...",
      helperText: "Share your professional background and why you are interested in this specific role.",
      minLength: 40,
      recommendedWords: 80,
      required: true,
    },
    {
      id: "q2",
      section: "B",
      sectionTitle: "Understanding of the Role",
      questionNumber: 2,
      questionText: `In your own words, what do you understand to be the primary day-to-day responsibilities of a ${title}, and what key qualities are necessary to succeed in this position?`,
      type: "long_text",
      placeholder: "Outline your understanding of the role's expectations and responsibilities...",
      helperText: "Demonstrate your understanding of the day-to-day duties and core expectations.",
      minLength: 40,
      recommendedWords: 100,
      required: true,
    },
    {
      id: "q3",
      section: "C",
      sectionTitle: "Relevant Skills & Experience",
      questionNumber: 3,
      questionText: `What technical tools, professional methodologies, or practical skills do you possess that make you well-prepared to execute the duties of this role?`,
      type: "long_text",
      placeholder: "Detail your relevant competencies, tools, software, or technical procedures...",
      helperText: "Include formal skills, personal projects, or practical methods you have applied.",
      minLength: 40,
      recommendedWords: 100,
      required: true,
    },
    {
      id: "q4",
      section: "C",
      sectionTitle: "Relevant Skills & Experience",
      questionNumber: 4,
      questionText: `Describe a specific project, challenging task, or accomplishment from your past work, studies, or personal initiatives that demonstrates your capability for this role. What was your personal contribution, and what was the outcome?`,
      type: "long_text",
      placeholder: "Detail the situation, the task you handled, your specific actions, and the measurable result...",
      helperText: "Use the Situation-Task-Action-Result (STAR) approach if helpful.",
      minLength: 50,
      recommendedWords: 120,
      required: true,
    },
    {
      id: "q5",
      section: "D",
      sectionTitle: "Role-Specific Problem Solving",
      questionNumber: 5,
      questionText: scenario1,
      type: "scenario",
      placeholder: "Walk through your step-by-step reasoning, communication, and action plan...",
      helperText: "Highlight your practical problem-solving ability, judgement, and composure.",
      minLength: 60,
      recommendedWords: 140,
      required: true,
    },
    {
      id: "q6",
      section: "D",
      sectionTitle: "Role-Specific Problem Solving",
      questionNumber: 6,
      questionText: scenario2,
      type: "scenario",
      placeholder: "Explain your diagnostic steps, corrective actions, and prevention strategy...",
      helperText: "Focus on accountability, attention to detail, and sound professional judgment.",
      minLength: 60,
      recommendedWords: 140,
      required: true,
    },
  ];

  return {
    jobId: job.id,
    jobTitle: title,
    department: deptName,
    organisation: orgName,
    estimatedMinutes: 20,
    instructions:
      "Please review each question carefully and provide honest, thorough responses. Your assessment answers will be analysed alongside your CV and application details by our AI evaluation engine to support recruitment shortlisting.",
    questions,
    generatedAt: new Date().toISOString(),
  };
}

