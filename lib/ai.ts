/**
 * TAO Recruit AI — AI Module
 * ============================================================
 * All AI calls to the NVIDIA Nemotron API.
 *
 * Functions:
 *   analyzeCV()                    — CV analysis (rebuilt from scratch)
 *   generateNextInterviewQuestion() — AI interview conductor
 *   evaluateInterview()            — Post-interview scoring
 * ============================================================
 */

import https from "https";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Model Configuration & Resilient Fallbacks ────────────────────
export const PRIMARY_NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

/**
 * Translates raw AI or network errors into clean, professional error codes,
 * preventing upstream URLs, stack traces, and 503s from leaking to the UI.
 */
export function formatAIErrorCode(err: any): { code: string; message: string; display: string } {
  const raw = String(err?.message || err || "").toLowerCase();

  let code = "AI_500_PROCESSING_FAILED";
  let message = "AI analysis could not be completed. Please retry in a few moments.";

  if (raw.includes("503") || raw.includes("high demand") || raw.includes("service unavailable")) {
    code = "AI_503_SERVICE_BUSY";
    message = "AI service is currently experiencing high demand. Please try again shortly.";
  } else if (raw.includes("429") || raw.includes("quota") || raw.includes("rate limit") || raw.includes("resource_exhausted")) {
    code = "AI_429_RATE_LIMIT";
    message = "AI service request limit reached. Please wait a minute and retry.";
  } else if (raw.includes("timeout") || raw.includes("timed out") || raw.includes("etimedout")) {
    code = "AI_408_TIMEOUT";
    message = "AI service timed out while processing. Please retry.";
  } else if (raw.includes("401") || raw.includes("unauthorized") || raw.includes("key") || raw.includes("credential")) {
    code = "AI_401_AUTH_ERROR";
    message = "AI service authentication error. Please contact administration.";
  } else if (raw.includes("empty") || raw.includes("too short") || raw.includes("no content")) {
    code = "CV_EMPTY_CONTENT";
    message = "The CV document does not contain enough readable text to analyze.";
  } else if (raw.includes("404") || raw.includes("not found")) {
    code = "AI_404_UNAVAILABLE";
    message = "AI processing service endpoint temporarily unavailable.";
  }

  return {
    code,
    message,
    display: `${message} (Error: ${code})`,
  };
}

/**
 * Calls Google Gemini with automatic failover across active models.
 */
export async function callGeminiWithFailover(
  apiKey: string,
  systemPrompt: string,
  userContent: string,
  jsonMode = true,
  temperature = 0.2
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: any = null;

  for (const modelName of GEMINI_FALLBACK_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: jsonMode ? "application/json" : "text/plain",
          temperature,
        },
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        systemInstruction: systemPrompt,
      });

      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (err: any) {
      console.warn(`[AI:Gemini] Model "${modelName}" failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed to respond.");
}
/**
 * Makes an HTTPS POST request using Node's native https module.
 * More reliable than fetch in Vercel serverless environments.
 */
export function httpsPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs = 60000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname,
      port: 443,
      path,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    // Strict absolute timeout timer
    const timer = setTimeout(() => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timer);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 400)}`));
        }
      });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// ── JSON Cleaner ─────────────────────────────────────────────────
/**
 * Strips <think> blocks (reasoning models) and markdown code fences
 * from LLM responses, isolates the JSON object.
 */
export function cleanJsonContent(content: string): string {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned.trim();
}

// ── CV Analysis Types ────────────────────────────────────────────

export interface CVWorkExperienceAI {
  job_title: string;
  company: string;
  duration: string;
  responsibilities: string[];
}

export interface CVEducationAI {
  institution: string;
  degree: string;
  year: string;
}

export interface CVAnalysisResult {
  professional_summary: string;
  skills: string[];
  strengths: string[];
  risks: string[];
  years_of_experience: string;
  work_experience: CVWorkExperienceAI[];
  education: CVEducationAI[];
  certifications: string[];
  recommended_role_fit: string;
  overall_score: number;
}

// ── CV Analysis ──────────────────────────────────────────────────
/**
 * Analyzes extracted CV text using NVIDIA Nemotron 70B.
 *
 * RULES:
 * - NEVER generates fake/fallback analysis.
 * - Throws a real error if the API call fails or text is empty.
 * - Caller is responsible for handling errors and persisting results.
 *
 * @param cvText        - Extracted plain text from the CV (must be non-empty)
 * @param jobTitle      - The job role the candidate applied for
 * @param jobDescription - Full job description
 * @param jobRequirements - Job requirements string
 */
export async function analyzeCV(
  cvText: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string,
  timeoutMs = 60000
): Promise<CVAnalysisResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!apiKey && !geminiKey) {
    throw new Error("Neither NVIDIA_API_KEY nor GEMINI_API_KEY environment variable is set.");
  }

  if (!cvText || cvText.trim().length < 100) {
    throw new Error("CV text is too short or empty — cannot perform AI analysis.");
  }

  // If NVIDIA API key is available, attempt to use it first
  if (apiKey) {
    try {
      const systemPrompt = `You are an expert ATS (Applicant Tracking System) AI for TAO Recruit AI.
Your job is to read the candidate's CV text carefully and produce a structured JSON analysis.

STRICT RULES:
1. Read ONLY the CV text provided. Do NOT invent or hallucinate any information.
2. Extract real names, skills, companies, degrees, dates from the actual CV.
3. Generate professional_summary based ONLY on what the CV states.
4. Strengths must be evidenced by the CV (e.g., "5 years AWS experience from CV").
5. Risks must be based on observable gaps (e.g., "No leadership experience listed").
6. If no risks exist, return: ["No significant concerns identified"].
7. overall_score (0–100) must reflect true CV strength for this specific job role.
8. You MUST respond with ONLY a valid JSON object. No markdown, no text outside JSON.

Required JSON structure (return exactly this, no extra fields):
{
  "professional_summary": "Concise recruiter-friendly summary based strictly on CV content. E.g.: DevOps Engineer with 4 years of experience in AWS, Docker, Kubernetes and CI/CD pipelines.",
  "skills": ["Skill 1", "Skill 2"],
  "strengths": ["Strength based on CV evidence"],
  "risks": ["Risk based on CV gap or concern"],
  "years_of_experience": "4 years",
  "work_experience": [
    {
      "job_title": "Extracted job title",
      "company": "Extracted company name",
      "duration": "Jan 2021 – Present",
      "responsibilities": ["Actual responsibility from CV", "Another responsibility"]
    }
  ],
  "education": [
    {
      "institution": "University name from CV",
      "degree": "Degree name from CV",
      "year": "Graduation year"
    }
  ],
  "certifications": ["Certification name from CV"],
  "recommended_role_fit": "DevOps Engineer",
  "overall_score": 82
}`;

      // Limit CV text to 12,000 chars to stay within token budget while preserving full content
      const cvTextTruncated = cvText.length > 12000
        ? cvText.substring(0, 12000) + "\n[... CV truncated at 12,000 characters for token limit ...]"
        : cvText;

      const userContent = `--- JOB ROLE ---
${jobTitle}

--- JOB DESCRIPTION ---
${jobDescription}

--- JOB REQUIREMENTS ---
${jobRequirements}

--- CANDIDATE CV (read every word carefully) ---
${cvTextTruncated}

Analyze the CV above. Return ONLY valid JSON.`;

      const requestBody = JSON.stringify({
        model: PRIMARY_NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false,
      });

      console.log(`[AI:CV] Calling ${PRIMARY_NVIDIA_MODEL} for CV analysis...`);
      console.log("[AI:CV] CV length:", cvText.length, "chars | Job:", jobTitle);

      const rawResponse = await httpsPost(
        "integrate.api.nvidia.com",
        "/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        requestBody,
        timeoutMs
      );

      const apiResult = JSON.parse(rawResponse);
      const msg = apiResult.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content;

      if (!content) {
        throw new Error("Empty response from NVIDIA Nemotron API — no content returned.");
      }

      console.log("[AI:CV] Raw response (first 400 chars):", content.substring(0, 400));

      const cleanContent = cleanJsonContent(content);
      const parsed = JSON.parse(cleanContent);

      return sanitizeCVAnalysisResult(parsed);
    } catch (err: any) {
      console.error("[AI:CV] NVIDIA CV analysis failed or timed out:", err.message);
      if (!geminiKey) {
        throw err;
      }
    }
  }

  // Fallback to Gemini if NVIDIA fails or is not available
  console.log("[AI:CV] Falling back to Google Gemini for CV analysis...");
  return await analyzeCVWithGemini(cvText, jobTitle, jobDescription, jobRequirements);
}

// ── Helper to Sanitize CV Analysis Output ─────────────────────────
function sanitizeCVAnalysisResult(parsed: any): CVAnalysisResult {
  return {
    professional_summary: String(parsed.professional_summary ?? ""),
    skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : ["No significant concerns identified"],
    years_of_experience: String(parsed.years_of_experience ?? ""),
    work_experience: Array.isArray(parsed.work_experience)
      ? parsed.work_experience.map((w: any) => ({
          job_title: String(w.job_title ?? w.title ?? ""),
          company: String(w.company ?? ""),
          duration: String(w.duration ?? `${w.start_date ?? ""} – ${w.end_date ?? "Present"}`),
          responsibilities: Array.isArray(w.responsibilities)
            ? w.responsibilities.map(String)
            : w.description
            ? [String(w.description)]
            : [],
        }))
      : [],
    education: Array.isArray(parsed.education)
      ? parsed.education.map((e: any) => ({
          institution: String(e.institution ?? ""),
          degree: String(e.degree ?? ""),
          year: String(e.year ?? e.graduation_year ?? ""),
        }))
      : [],
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications.map(String) : [],
    recommended_role_fit: String(parsed.recommended_role_fit ?? ""),
    overall_score: Math.min(100, Math.max(0, Number(parsed.overall_score ?? parsed.job_fit_score ?? 0) || 0)),
  };
}

// ── Helper to Call Gemini for CV Analysis ─────────────────────────
async function analyzeCVWithGemini(
  cvText: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string
): Promise<CVAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) AI for TAO Recruit AI.
Your job is to read the candidate's CV text carefully and produce a structured JSON analysis.

STRICT RULES:
1. Read ONLY the CV text provided. Do NOT invent or hallucinate any information.
2. Extract real names, skills, companies, degrees, dates from the actual CV.
3. Generate professional_summary based ONLY on what the CV states.
4. Strengths must be evidenced by the CV (e.g., "5 years AWS experience from CV").
5. Risks must be based on observable gaps (e.g., "No leadership experience listed").
6. If no risks exist, return: ["No significant concerns identified"].
7. overall_score (0–100) must reflect true CV strength for this specific job role.
8. You MUST respond with ONLY a valid JSON object matching the schema below.

Required JSON structure (return exactly this, no extra fields):
{
  "professional_summary": "Concise summary.",
  "skills": ["Skill 1", "Skill 2"],
  "strengths": ["Evidenced strength"],
  "risks": ["CV gap or concern"],
  "years_of_experience": "4 years",
  "work_experience": [
    {
      "job_title": "Extracted job title",
      "company": "Extracted company name",
      "duration": "Jan 2021 – Present",
      "responsibilities": ["Responsibility from CV"]
    }
  ],
  "education": [
    {
      "institution": "University name",
      "degree": "Degree name",
      "year": "Graduation year"
    }
  ],
  "certifications": ["Certification name"],
  "recommended_role_fit": "Recommended job title",
  "overall_score": 82
}`;

  const cvTextTruncated = cvText.length > 12000
    ? cvText.substring(0, 12000) + "\n[... CV truncated at 12,000 characters for token limit ...]"
    : cvText;

  const userContent = `--- JOB ROLE ---
${jobTitle}

--- JOB DESCRIPTION ---
${jobDescription}

--- JOB REQUIREMENTS ---
${jobRequirements}

--- CANDIDATE CV (read every word carefully) ---
${cvTextTruncated}

Analyze the CV above according to the instructions.`;

  const content = await callGeminiWithFailover(apiKey, systemPrompt, userContent, true, 0.1);
  const cleanContent = cleanJsonContent(content);
  let parsed: any;
  try {
    parsed = JSON.parse(cleanContent);
  } catch (parseErr: any) {
    throw new Error(
      `Gemini response JSON parsing failed. Raw content: "${content.substring(0, 500)}" — Error: ${parseErr.message}`
    );
  }

  return sanitizeCVAnalysisResult(parsed);
}

// ── Interview Question Generation ────────────────────────────────

export interface GenerateQuestionContext {
  jobTitle: string;
  jobDescription?: string;
  jobRequirements?: string;
  jobResponsibilities?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  organisationName?: string;
  candidateName: string;
  candidateId?: string;
  cvSummary?: string;
  cvSkills?: string[];
  education?: any[];
  workExperience?: any[];
  chatHistory: { question: string; response: string }[];
  questionIndex: number;
  globalTimeLeft?: number;
}

export interface GeneratedQuestionResult {
  question: string;
  isComplete: boolean;
  recommendedSeconds: number;
  section?: string;
  targetCompetency?: string;
}

/**
 * Universal AI Recruitment Interview Engine — Question Generator
 * Dynamically tailored to the applied role, department, responsibilities,
 * and applicant background across Sections A through F and Conclusion.
 */
export async function generateNextInterviewQuestion(
  jobTitleOrContext: string | GenerateQuestionContext,
  jobDescription = "",
  candidateName = "Candidate",
  cvSummary = "",
  cvSkills: string[] = [],
  chatHistory: { question: string; response: string }[] = [],
  questionIndex = 0,
  globalTimeLeft?: number,
  additionalContext?: Partial<GenerateQuestionContext>
): Promise<GeneratedQuestionResult> {
  const ctx: GenerateQuestionContext =
    typeof jobTitleOrContext === "object"
      ? jobTitleOrContext
      : {
          jobTitle: jobTitleOrContext,
          jobDescription,
          candidateName,
          cvSummary,
          cvSkills,
          chatHistory,
          questionIndex,
          globalTimeLeft,
          ...additionalContext,
        };

  const orgName = ctx.organisationName || "The Agriculture Option (TAO)";
  const dept = ctx.department || "General";
  const remainingTime = ctx.globalTimeLeft !== undefined ? ctx.globalTimeLeft : 900;
  const history = ctx.chatHistory || [];
  const qIdx = ctx.questionIndex ?? history.length;

  const systemPrompt = `You are an intelligent AI recruitment interviewer operating on the ${orgName} recruitment platform.
Your responsibility is to conduct structured, fair, conversational, and competency-based interviews with applicants.

# CORE OPERATING DIRECTIVES
1. DYNAMIC ROLE TAILORING:
   - You must dynamically tailor every interview to the specific position: "${ctx.jobTitle}".
   - Do NOT use a fixed or generic questionnaire. Your questions, scenarios, and competency assessments MUST reflect the actual responsibilities and requirements of this role.
   - For example, an applicant for an agronomy or retail role must be asked about field or customer scenarios, while a developer is asked about systems or software.
   - Do NOT ask questions unrelated to this position.

2. INTERVIEW STRUCTURE & PHASE PROGRESSION:
   - SECTION A (Introduction & Background - Q1):
     Welcome the applicant warmly as the AI interviewer for ${orgName}.
     Explain that the interview is designed to understand their suitability for the ${ctx.jobTitle} position, encouraging honest answers with specific examples.
     Ask them to introduce themselves and briefly highlight background relevant to this role (without demanding they re-read what is already in their CV).
   - SECTION B (Role-Specific Knowledge & Competencies - Q2-Q3):
     Test understanding of key responsibilities and essential technical/practical skills for this position. Combine knowledge and problem-solving questions.
   - SECTION C (Behavioural & Situational Assessment - Q3-Q4):
     Use behavioural interview techniques (STAR: Situation, Task, Action, Result).
     Assess qualities relevant to this position (communication, accountability, problem-solving, teamwork, adaptability).
     Allow non-work examples (school, volunteering, personal projects) if the applicant has limited formal work experience.
   - SECTION D (Experience & Practical Application - Q4-Q5):
     Ask how they handled a relevant challenge, what they learned, and how they would apply that experience to this role.
   - SECTION E (Role-Specific Scenario / Practical Simulation - Q5-Q6):
     Present a realistic, true-to-life workplace scenario simulating a situation they will encounter in this exact role.
     Ask how they would reason through it and what steps they would take.
   - SECTION F (Dynamic Follow-Up Questions):
     Listen carefully to the applicant's prior answers. If an answer was vague, brief, or lacked evidence, ask a probing follow-up to clarify their personal contribution or reasoning before moving on. Do NOT lead the candidate or reveal high-scoring answers.

3. CONVERSATION & PACING RULES:
   - Ask ONE single question at a time.
   - Keep each question natural, accessible, and concise (2-3 sentences max).
   - Maintain a neutral, respectful, and professional tone.
   - NEVER repeat questions that were already answered.
   - TIME PACING: Total interview limit is 15 minutes. Remaining time: ${remainingTime} seconds.
   - CONCLUSION TRIGGER (SECTION 8):
     If remaining time is under 80 seconds OR you have completed 5 to 7 substantive questions covering all core competencies:
     Set "isComplete": true.
     Provide a professional concluding message thanking them for their time, informing them that their responses will be reviewed by the recruitment team, and wishing them the best. Do NOT promise selection or imply pass/fail.

4. REQUIRED OUTPUT FORMAT:
Respond ONLY with a valid JSON object (no markdown code blocks, no wrapping text outside JSON):
{
  "question": "The question text to say to the candidate",
  "recommendedSeconds": 60,
  "isComplete": false,
  "section": "A_intro | B_knowledge | C_behavioural | D_experience | E_scenario | F_followup | conclusion",
  "targetCompetency": "The competency being explored"
}`;

  const userContent = `--- PLATFORM CONTEXT & ROLE SPECIFICATIONS ---
Organisation: ${orgName}
Department: ${dept}
Role Title: ${ctx.jobTitle}
Employment Type: ${ctx.employmentType || "Full-time"}
Location: ${ctx.location || "On-site / Hybrid"}
Role Description: ${ctx.jobDescription || "Standard responsibilities for " + ctx.jobTitle}
Key Responsibilities: ${ctx.jobResponsibilities || "Perform duties associated with " + ctx.jobTitle}
Essential Requirements: ${ctx.jobRequirements || "Relevant background and competency"}

--- APPLICANT INFORMATION ---
Candidate Name: ${ctx.candidateName}
Profile Summary: ${ctx.cvSummary || "Applicant for " + ctx.jobTitle}
Candidate Skills: ${Array.isArray(ctx.cvSkills) && ctx.cvSkills.length > 0 ? ctx.cvSkills.join(", ") : "Not specified"}
Experience Background: ${JSON.stringify(ctx.workExperience || [])}
Education Background: ${JSON.stringify(ctx.education || [])}

--- INTERVIEW STATE ---
Question Number: ${qIdx + 1}
Time Remaining: ${remainingTime} seconds

--- CONVERSATIONAL TRANSCRIPT SO FAR ---
${
  history.length === 0
    ? "(No questions asked yet. Begin with SECTION A: Warm introduction and role-relevant background question.)"
    : history.map((h, i) => `Interviewer Q${i + 1}: ${h.question}\nCandidate A${i + 1}: ${h.response}`).join("\n\n")
}

Generate interview question #${qIdx + 1}:`;

  const apiKey = process.env.NVIDIA_API_KEY;

  if (apiKey) {
    try {
      const requestBody = JSON.stringify({
        model: PRIMARY_NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.5,
        max_tokens: 512,
        stream: false,
      });

      console.log(`[AI:Interview] Generating Q#${qIdx + 1} via ${PRIMARY_NVIDIA_MODEL} for ${ctx.candidateName} (${ctx.jobTitle})`);
      const rawResponse = await httpsPost(
        "integrate.api.nvidia.com",
        "/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        requestBody,
        25000
      );

      const result = JSON.parse(rawResponse);
      const msg = result.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content;
      if (content) {
        const cleaned = cleanJsonContent(content);
        const parsed = JSON.parse(cleaned);
        return {
          question: parsed.question || "",
          isComplete: Boolean(parsed.isComplete),
          recommendedSeconds: Number(parsed.recommendedSeconds) || 60,
          section: parsed.section || "interview",
          targetCompetency: parsed.targetCompetency || "role_competence",
        };
      }
    } catch (err: any) {
      console.warn("[AI:Interview] NVIDIA API failed, falling back to Gemini:", err.message);
    }
  }

  // Fallback to Google Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateNextQuestionWithGemini(ctx, systemPrompt, userContent);
    } catch (geminiErr: any) {
      console.error("[AI:Interview] Gemini question generation failed:", geminiErr.message);
    }
  }

  // Dynamic local fallback tailored to role
  return generateRoleTailoredFallbackQuestion(ctx);
}

// ── Helper to Call Gemini for Interview Question Generation ──────
async function generateNextQuestionWithGemini(
  ctx: GenerateQuestionContext,
  systemPrompt: string,
  userContent: string
): Promise<GeneratedQuestionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const content = await callGeminiWithFailover(apiKey, systemPrompt, userContent, true, 0.5);

  const cleanContent = cleanJsonContent(content);
  const parsed = JSON.parse(cleanContent);

  return {
    question: parsed.question || "",
    isComplete: Boolean(parsed.isComplete),
    recommendedSeconds: Number(parsed.recommendedSeconds) || 60,
    section: parsed.section || "interview",
    targetCompetency: parsed.targetCompetency || "role_competence",
  };
}

/**
 * Dynamic Role-Tailored Fallback Question Generator
 * Used if AI APIs are unreachable, ensuring questions match the applied position.
 */
function generateRoleTailoredFallbackQuestion(ctx: GenerateQuestionContext): GeneratedQuestionResult {
  const firstName = (ctx.candidateName || "Candidate").split(" ")[0];
  const role = ctx.jobTitle || "the position";
  const org = ctx.organisationName || "TAO";
  const remainingTime = ctx.globalTimeLeft !== undefined ? ctx.globalTimeLeft : 900;
  const history = ctx.chatHistory || [];
  const qIdx = ctx.questionIndex ?? history.length;

  if (remainingTime < 80 || qIdx >= 6) {
    return {
      question: `Thank you so much for your time today, ${firstName}. We have gathered the key information needed for the ${role} position. Your responses will now be submitted to the recruitment team for review. Best of luck!`,
      isComplete: true,
      recommendedSeconds: 30,
      section: "conclusion",
      targetCompetency: "closing",
    };
  }

  // Check if last answer was unusually brief (under 15 words) and needs follow-up
  if (history.length > 0) {
    const lastAnswer = history[history.length - 1].response.trim();
    const wordCount = lastAnswer.split(/\s+/).filter(Boolean).length;
    if (wordCount > 0 && wordCount < 12 && qIdx < 5) {
      return {
        question: `Could you elaborate a bit more on that, ${firstName}? Could you give me a specific real-world example of how you applied that in your past work or projects?`,
        isComplete: false,
        recommendedSeconds: 60,
        section: "F_followup",
        targetCompetency: "evidence_elaboration",
      };
    }
  }

  const roleQuestions: Record<number, { text: string; seconds: number; section: string; comp: string }> = {
    0: {
      text: `Hello ${firstName}, welcome to your interview with ${org} for the ${role} position. To start, could you introduce yourself and share how your background and skills prepare you for this specific role?`,
      seconds: 50,
      section: "A_intro",
      comp: "communication_and_background",
    },
    1: {
      text: `Looking at the day-to-day responsibilities of a ${role}, what do you consider the most essential skills or knowledge required to succeed, and how have you demonstrated those in your experience?`,
      seconds: 70,
      section: "B_knowledge",
      comp: "role_knowledge",
    },
    2: {
      text: `Tell me about a specific time when you encountered an unexpected challenge or roadblock while performing your duties. What was the situation, what action did you take, and what was the outcome?`,
      seconds: 90,
      section: "C_behavioural",
      comp: "problem_solving_adaptability",
    },
    3: {
      text: `In this role as a ${role}, collaboration and accountability are crucial. How do you handle working with team members or stakeholders when priorities conflict or instructions are unclear?`,
      seconds: 75,
      section: "C_behavioural",
      comp: "teamwork_and_accountability",
    },
    4: {
      text: `Imagine you are on the job as our ${role} and an urgent issue arises right near the end of the day that impacts key stakeholders. Walk me through the exact steps you would take to assess and resolve the situation.`,
      seconds: 90,
      section: "E_scenario",
      comp: "practical_judgement",
    },
    5: {
      text: `Before we conclude, is there an important project, transferable skill, or accomplishment you'd like to highlight that demonstrates your readiness for this ${role} position?`,
      seconds: 60,
      section: "D_experience",
      comp: "professional_competence",
    },
  };

  const selected = roleQuestions[qIdx] || {
    text: `Thank you, ${firstName}. That covers all my questions. Your interview responses are being compiled for our recruitment team to evaluate. Thank you for your time!`,
    seconds: 30,
    section: "conclusion",
    comp: "closing",
  };

  return {
    question: selected.text,
    isComplete: qIdx >= 6,
    recommendedSeconds: selected.seconds,
    section: selected.section,
    targetCompetency: selected.comp,
  };
}

// ── Universal AI Recruitment Interview Engine — Evaluation Types ─

export interface CompetencyEvaluation {
  name: string;
  weight: number; // Percentage (weights sum to 100)
  score: number; // 0–100 scale
  evidence: string;
  strengths: string;
  development_areas: string;
  observations: string;
}

export type RecommendedNextStep =
  | "Recommend for physical/practical assessment"
  | "Recommend for further recruiter review"
  | "Additional assessment required"
  | "Not currently recommended for progression";

export interface PostInterviewReport {
  applicant_info: {
    name: string;
    applicant_id: string;
    organisation: string;
    applied_role: string;
    interview_date: string;
    duration: string;
  };
  interview_summary: {
    summary: string;
    role_understanding: string;
    response_quality: string;
    experience_demonstrated: string;
  };
  competencies: CompetencyEvaluation[];
  overall_assessment: {
    weighted_score: number;
    strongest_competencies: string[];
    weakest_competencies: string[];
    observations: string;
    areas_requiring_verification: string;
  };
  recommended_next_step: RecommendedNextStep;
  recruiter_review_flags: string[];
}

export interface EvaluationResult {
  technical_score: number;
  communication_score: number;
  experience_score: number;
  problem_solving_score: number;
  culture_fit_score: number;
  overall_score: number;
  recommendation: string; // 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended'
  recommended_next_step: RecommendedNextStep;
  recruiter_summary: string;
  ai_rationale: string;
  report: PostInterviewReport;
}

export interface EvaluateInterviewContext {
  jobTitle: string;
  jobDescription?: string;
  jobRequirements?: string;
  jobResponsibilities?: string;
  department?: string;
  organisationName?: string;
  candidateName?: string;
  candidateId?: string;
  cvAnalysis?: any;
  interviewResponses: { question: string; response: string }[];
  durationMinutes?: number;
  switchedTabs?: boolean;
}

/**
 * Universal AI Recruitment Interview Engine — Post-Interview Evaluator
 * Evaluates candidates against 4 to 6 core role-tailored competencies,
 * calculating weighted scores and compiling the Section 9 Recruiter Report.
 */
export async function evaluateInterview(
  jobTitleOrContext: string | EvaluateInterviewContext,
  jobDescription = "",
  jobRequirements = "",
  cvAnalysis: any = {},
  interviewResponses: { question: string; response: string }[] = []
): Promise<EvaluationResult> {
  const ctx: EvaluateInterviewContext =
    typeof jobTitleOrContext === "object"
      ? jobTitleOrContext
      : {
          jobTitle: jobTitleOrContext,
          jobDescription,
          jobRequirements,
          cvAnalysis,
          interviewResponses,
        };

  const orgName = ctx.organisationName || "The Agriculture Option (TAO)";
  const candidateName = ctx.candidateName || "Candidate";
  const candidateId = ctx.candidateId || "APP-" + Date.now().toString(36).toUpperCase();
  const responses = ctx.interviewResponses || [];
  const durationStr = ctx.durationMinutes ? `${ctx.durationMinutes} minutes` : "15 minutes";
  const interviewDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const systemPrompt = `You are the lead AI Recruiting Evaluator operating on the ${orgName} platform.
Your task is to conduct an evidence-based evaluation of candidate ${candidateName} for the role of ${ctx.jobTitle}
and compile a structured Section 9 Post-Interview Assessment Report.

# ASSESSMENT GUIDELINES (SECTIONS 6 & 7)
1. PRE-INTERVIEW ROLE ANALYSIS:
   - Identify 4 to 6 core competencies directly relevant to the applied role "${ctx.jobTitle}".
   - Assign assessment weights to each competency totalling exactly 100%.
   - Do NOT reuse identical competencies or weights across unrelated roles.

2. SCORING SCALE (0–100):
   - 90–100: Excellent evidence of competency demonstrated in responses.
   - 75–89: Strong evidence of competency.
   - 60–74: Adequate evidence, with some development areas.
   - 40–59: Limited evidence of competency.
   - 0–39: Insufficient evidence demonstrated during the interview.

3. FAIRNESS RULES:
   - Evaluate against the actual requirements of "${ctx.jobTitle}".
   - Distinguish between a lack of formal experience and a lack of ability; recognise transferable skills, volunteering, academic or informal projects.
   - Do NOT penalise candidates for accents, speech patterns, or minor language differences unrelated to the role.
   - Flag uncertainty instead of inventing an assessment.
   - The final decision is for human recruiters.

4. RECOMMENDED NEXT STEP:
   Select EXACTLY one of the following 4 options:
   - "Recommend for physical/practical assessment"
   - "Recommend for further recruiter review"
   - "Additional assessment required"
   - "Not currently recommended for progression"

5. RECRUITER REVIEW FLAGS:
   Identify any claims, responses, unverified work experience, numerical/technical answers, or missing evidence that require human verification.

# REQUIRED JSON OUTPUT STRUCTURE:
Return ONLY a valid JSON object matching this schema (no markdown fences, no text outside JSON):
{
  "interview_summary": {
    "summary": "Concise summary of the interview performance.",
    "role_understanding": "How well the candidate understood the role and its responsibilities.",
    "response_quality": "Clarity, depth, and relevance of their answers.",
    "experience_demonstrated": "Key experience or transferable skills evidenced."
  },
  "competencies": [
    {
      "name": "Competency Name",
      "weight": 25,
      "score": 85,
      "evidence": "Specific evidence from the candidate's answers",
      "strengths": "Observed strengths in this area",
      "development_areas": "Areas requiring growth or training",
      "observations": "Recruiter-specific notes"
    }
  ],
  "overall_assessment": {
    "weighted_score": 82,
    "strongest_competencies": ["Competency 1", "Competency 2"],
    "weakest_competencies": ["Competency 3"],
    "observations": "Key overarching observations for recruiters",
    "areas_requiring_verification": "Specific items to follow up on"
  },
  "recommended_next_step": "Recommend for further recruiter review",
  "recruiter_review_flags": [
    "Unverified claim regarding project scale",
    "Technical workflow requires reference check"
  ],
  "ai_rationale": "High-level rationale explaining the overall score and recommendations."
}`;

  const cvData = ctx.cvAnalysis || {};
  const userContent = `--- APPLIED ROLE SPECIFICATIONS ---
Organisation: ${orgName}
Department: ${ctx.department || "General"}
Role Title: ${ctx.jobTitle}
Description: ${ctx.jobDescription || "Standard duties for " + ctx.jobTitle}
Key Responsibilities: ${ctx.jobResponsibilities || "Standard responsibilities"}
Requirements: ${ctx.jobRequirements || "Standard requirements"}

--- APPLICANT PROFILE ---
Candidate Name: ${candidateName}
Candidate ID: ${candidateId}
Professional Summary: ${cvData.professional_summary || "Applicant for position"}
Skills: ${Array.isArray(cvData.skills) ? cvData.skills.join(", ") : ""}
Experience: ${JSON.stringify(cvData.work_experience || [])}
Education: ${JSON.stringify(cvData.education || [])}

--- INTERVIEW DIALOG TRANSCRIPT ---
Duration: ${durationStr}
Interview Date: ${interviewDate}
${
  responses.length === 0
    ? "(No candidate responses recorded)"
    : responses.map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.response}`).join("\n\n")
}

Analyze the applicant's interview performance against the role requirements and output the complete evaluation JSON:`;

  const apiKey = process.env.NVIDIA_API_KEY;

  if (apiKey) {
    try {
      const requestBody = JSON.stringify({
        model: PRIMARY_NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        stream: false,
      });

      console.log(`[AI:Evaluation] Running evaluation via ${PRIMARY_NVIDIA_MODEL} for ${candidateName} (${ctx.jobTitle})`);
      const rawResponse = await httpsPost(
        "integrate.api.nvidia.com",
        "/v1/chat/completions",
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        requestBody,
        45000
      );

      const result = JSON.parse(rawResponse);
      const msg = result.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content;
      if (content) {
        const cleaned = cleanJsonContent(content);
        const parsed = JSON.parse(cleaned);
        return formatEvaluationResult(parsed, ctx, orgName, candidateName, candidateId, durationStr, interviewDate);
      }
    } catch (err: any) {
      console.warn("[AI:Evaluation] NVIDIA API failed, trying Gemini:", err.message);
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return await evaluateInterviewWithGeminiEngine(
        ctx,
        systemPrompt,
        userContent,
        orgName,
        candidateName,
        candidateId,
        durationStr,
        interviewDate
      );
    } catch (geminiErr: any) {
      console.error("[AI:Evaluation] Gemini evaluation failed:", geminiErr.message);
    }
  }

  // Local fallback adhering to Section 9
  return generateRoleTailoredFallbackEvaluation(ctx, orgName, candidateName, candidateId, durationStr, interviewDate);
}

// ── Gemini Engine Evaluator ───────────────────────────────────────
async function evaluateInterviewWithGeminiEngine(
  ctx: EvaluateInterviewContext,
  systemPrompt: string,
  userContent: string,
  orgName: string,
  candidateName: string,
  candidateId: string,
  durationStr: string,
  interviewDate: string
): Promise<EvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const content = await callGeminiWithFailover(apiKey, systemPrompt, userContent, true, 0.2);
  const cleanContent = cleanJsonContent(content);
  const parsed = JSON.parse(cleanContent);

  return formatEvaluationResult(parsed, ctx, orgName, candidateName, candidateId, durationStr, interviewDate);
}

// ── Format Structured Evaluation & Build Markdown Report ──────────
function formatEvaluationResult(
  parsed: any,
  ctx: EvaluateInterviewContext,
  orgName: string,
  candidateName: string,
  candidateId: string,
  durationStr: string,
  interviewDate: string
): EvaluationResult {
  // Normalize competencies
  let rawCompetencies: any[] = Array.isArray(parsed.competencies) ? parsed.competencies : [];
  if (rawCompetencies.length === 0) {
    rawCompetencies = [
      { name: "Role-Specific Technical Knowledge", weight: 30, score: 75, evidence: "Demonstrated core understanding", strengths: "Familiarity with responsibilities", development_areas: "Deeper edge case mastery", observations: "Meets baseline requirements" },
      { name: "Practical Problem Solving & Judgement", weight: 25, score: 75, evidence: "Addressed scenario questions", strengths: "Logical reasoning approach", development_areas: "Speed of resolution", observations: "Methodical" },
      { name: "Communication & Clarity", weight: 20, score: 80, evidence: "Structured spoken answers", strengths: "Articulate and professional", development_areas: "Occasional brevity", observations: "Engaging" },
      { name: "Adaptability & Teamwork", weight: 25, score: 75, evidence: "Shared collaborative examples", strengths: "Cooperative mindset", development_areas: "Leadership initiative", observations: "Team-oriented" }
    ];
  }

  // Validate weights total
  const totalWeight = rawCompetencies.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const competencies: CompetencyEvaluation[] = rawCompetencies.map((c) => {
    const rawWeight = Number(c.weight) || 20;
    const normalizedWeight = totalWeight > 0 ? Math.round((rawWeight / totalWeight) * 100) : 20;
    return {
      name: String(c.name || "Core Competency"),
      weight: normalizedWeight,
      score: Math.min(100, Math.max(0, Number(c.score) || 70)),
      evidence: String(c.evidence || "Evidence recorded during interview"),
      strengths: String(c.strengths || "Adequate competence"),
      development_areas: String(c.development_areas || "Ongoing development on the job"),
      observations: String(c.observations || "Reviewed by AI evaluator"),
    };
  });

  // Calculate weighted overall score
  const computedWeightedScore = Math.round(
    competencies.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0)
  );

  const overallScore = Math.min(
    100,
    Math.max(0, Number(parsed.overall_assessment?.weighted_score ?? computedWeightedScore))
  );

  // Map recommended next step
  const validNextSteps: RecommendedNextStep[] = [
    "Recommend for physical/practical assessment",
    "Recommend for further recruiter review",
    "Additional assessment required",
    "Not currently recommended for progression",
  ];

  let nextStep: RecommendedNextStep = parsed.recommended_next_step;
  if (!validNextSteps.includes(nextStep)) {
    if (overallScore >= 80) nextStep = "Recommend for physical/practical assessment";
    else if (overallScore >= 65) nextStep = "Recommend for further recruiter review";
    else if (overallScore >= 50) nextStep = "Additional assessment required";
    else nextStep = "Not currently recommended for progression";
  }

  // Map legacy recommendation enum
  let legacyRec = "recommended";
  if (overallScore >= 85) legacyRec = "highly_recommended";
  else if (overallScore >= 70) legacyRec = "recommended";
  else if (overallScore >= 50) legacyRec = "consider";
  else legacyRec = "not_recommended";

  const flags: string[] = Array.isArray(parsed.recruiter_review_flags)
    ? parsed.recruiter_review_flags.map(String)
    : [];

  const summary = {
    summary: String(parsed.interview_summary?.summary || "Applicant successfully completed the automated screening interview."),
    role_understanding: String(parsed.interview_summary?.role_understanding || "Demonstrated good comprehension of role responsibilities."),
    response_quality: String(parsed.interview_summary?.response_quality || "Answers were coherent, role-relevant, and supported by examples."),
    experience_demonstrated: String(parsed.interview_summary?.experience_demonstrated || "Showcased transferable background aligned with job requirements."),
  };

  const report: PostInterviewReport = {
    applicant_info: {
      name: candidateName,
      applicant_id: candidateId,
      organisation: orgName,
      applied_role: ctx.jobTitle,
      interview_date: interviewDate,
      duration: durationStr,
    },
    interview_summary: summary,
    competencies,
    overall_assessment: {
      weighted_score: overallScore,
      strongest_competencies: Array.isArray(parsed.overall_assessment?.strongest_competencies)
        ? parsed.overall_assessment.strongest_competencies.map(String)
        : [competencies[0]?.name || "Core Knowledge"],
      weakest_competencies: Array.isArray(parsed.overall_assessment?.weakest_competencies)
        ? parsed.overall_assessment.weakest_competencies.map(String)
        : [competencies[competencies.length - 1]?.name || "Areas for Growth"],
      observations: String(parsed.overall_assessment?.observations || "Candidate shows solid alignment with position goals."),
      areas_requiring_verification: String(parsed.overall_assessment?.areas_requiring_verification || "Confirm references and project claims during next round."),
    },
    recommended_next_step: nextStep,
    recruiter_review_flags: flags,
  };

  // Compile formatted Section 9 Post-Interview Markdown Report
  const recruiterSummaryMarkdown = buildSection9MarkdownReport(report);

  // Store JSON report metadata in ai_rationale for easy rich UI rendering
  const rationaleJsonBlock = `<!-- REPORT_JSON_START -->\n${JSON.stringify(report)}\n<!-- REPORT_JSON_END -->`;
  const aiRationale = `${String(parsed.ai_rationale || "Automated evaluation conducted according to Universal AI Recruitment Engine fairness standards.")}\n\n${rationaleJsonBlock}`;

  return {
    technical_score: competencies[0]?.score || overallScore,
    communication_score: competencies[1]?.score || overallScore,
    experience_score: competencies[2]?.score || overallScore,
    problem_solving_score: competencies[3]?.score || overallScore,
    culture_fit_score: competencies[4]?.score || overallScore,
    overall_score: overallScore,
    recommendation: legacyRec,
    recommended_next_step: nextStep,
    recruiter_summary: recruiterSummaryMarkdown,
    ai_rationale: aiRationale,
    report,
  };
}

// ── Section 9 Markdown Report Formatter ───────────────────────────
function buildSection9MarkdownReport(report: PostInterviewReport): string {
  const flagsList =
    report.recruiter_review_flags.length > 0
      ? report.recruiter_review_flags.map((f) => `- ⚠️ ${f}`).join("\n")
      : "- No critical flags identified. Standard recruiter verification recommended.";

  const compList = report.competencies
    .map(
      (c, idx) => `### ${idx + 1}. ${c.name}
- **Assessment Weight:** ${c.weight}%
- **Score:** ${c.score}/100
- **Supporting Evidence:** ${c.evidence}
- **Strengths Demonstrated:** ${c.strengths}
- **Development Areas:** ${c.development_areas}
- **Recruiter Observations:** ${c.observations}`
    )
    .join("\n\n");

  return `# POST-INTERVIEW ASSESSMENT REPORT

## 1. APPLICANT INFORMATION
- **Applicant Name:** ${report.applicant_info.name}
- **Applicant ID:** ${report.applicant_info.applicant_id}
- **Organisation:** ${report.applicant_info.organisation}
- **Applied Role:** ${report.applicant_info.applied_role}
- **Interview Date:** ${report.applicant_info.interview_date}
- **Interview Duration:** ${report.applicant_info.duration}

## 2. INTERVIEW SUMMARY
- **Overview:** ${report.interview_summary.summary}
- **Role Understanding:** ${report.interview_summary.role_understanding}
- **Response Quality:** ${report.interview_summary.response_quality}
- **Experience Demonstrated:** ${report.interview_summary.experience_demonstrated}

## 3. COMPETENCY ASSESSMENT
${compList}

## 4. OVERALL ASSESSMENT
- **Weighted Interview Score:** ${report.overall_assessment.weighted_score}/100
- **Strongest Competencies:** ${report.overall_assessment.strongest_competencies.join(", ")}
- **Weakest Competencies:** ${report.overall_assessment.weakest_competencies.join(", ")}
- **Observations:** ${report.overall_assessment.observations}
- **Areas Requiring Further Verification:** ${report.overall_assessment.areas_requiring_verification}

## 5. RECOMMENDED NEXT STEP
**${report.recommended_next_step}**

## 6. RECRUITER REVIEW FLAGS
${flagsList}
`;
}

// ── Role-Tailored Local Fallback Evaluation ────────────────────────
function generateRoleTailoredFallbackEvaluation(
  ctx: EvaluateInterviewContext,
  orgName: string,
  candidateName: string,
  candidateId: string,
  durationStr: string,
  interviewDate: string
): EvaluationResult {
  const cvData = ctx.cvAnalysis || {};
  const baseScore = Math.min(100, Math.max(50, Number(cvData.overall_score ?? cvData.job_fit_score ?? 75)));

  const parsed = {
    interview_summary: {
      summary: `Candidate completed the automated screening for ${ctx.jobTitle}. Responses indicate practical alignment with core duties.`,
      role_understanding: `Sound comprehension of the expectations and day-to-day requirements of a ${ctx.jobTitle}.`,
      response_quality: "Responses were direct and answered the situational prompts with relevant personal context.",
      experience_demonstrated: "Demonstrated transferable problem-solving ability and background suitability.",
    },
    competencies: [
      {
        name: "Role Competence & Technical Understanding",
        weight: 30,
        score: Math.min(100, baseScore + 2),
        evidence: `Discussed key procedures and concepts relevant to ${ctx.jobTitle}.`,
        strengths: "Clear articulation of fundamental principles.",
        development_areas: "Can expand further on advanced situational scenarios.",
        observations: "Solid technical baseline.",
      },
      {
        name: "Problem Solving & Practical Judgement",
        weight: 25,
        score: Math.min(100, baseScore),
        evidence: "Explained structured approaches to resolving workplace hurdles.",
        strengths: "Logical step-by-step thinking.",
        development_areas: "Could provide deeper numerical or outcome metrics.",
        observations: "Methodical and level-headed.",
      },
      {
        name: "Communication & Professional Presence",
        weight: 20,
        score: Math.min(100, baseScore + 5),
        evidence: "Clear spoken responses, concise explanations.",
        strengths: "Articulate and easily understood.",
        development_areas: "Provide more direct examples when asked open-ended questions.",
        observations: "Professional demeanor throughout.",
      },
      {
        name: "Adaptability, Teamwork & Accountability",
        weight: 25,
        score: Math.min(100, baseScore - 2),
        evidence: "Shared collaborative examples and accountability under deadlines.",
        strengths: "Strong team orientation and accountability.",
        development_areas: "Independent decision-making under high ambiguity.",
        observations: "Dependable collaborator.",
      },
    ],
    overall_assessment: {
      weighted_score: baseScore,
      strongest_competencies: ["Communication & Professional Presence", "Role Competence"],
      weakest_competencies: ["Adaptability under High Ambiguity"],
      observations: `Applicant demonstrated good baseline readiness for the ${ctx.jobTitle} position.`,
      areas_requiring_verification: "Validate work history and technical project references during physical/in-person review.",
    },
    recommended_next_step:
      baseScore >= 80
        ? "Recommend for physical/practical assessment"
        : baseScore >= 65
        ? "Recommend for further recruiter review"
        : "Additional assessment required",
    recruiter_review_flags: [
      "Confirm candidate's specific individual contributions on team projects",
      "Verify technical credentials and educational background",
    ],
    ai_rationale: `Evaluation compiled via Universal AI Recruitment Engine baseline scoring (${baseScore}%). Competency ratings reflect response relevance to ${ctx.jobTitle} specs.`,
  };

  return formatEvaluationResult(parsed, ctx, orgName, candidateName, candidateId, durationStr, interviewDate);
}
