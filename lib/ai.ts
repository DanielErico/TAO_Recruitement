import { CVAnalysis } from "@/types";
import https from "https";

/**
 * Makes an HTTPS request using Node's native https module (more reliable than fetch in some environments).
 */
function httpsPost(
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
      timeout: timeoutMs,
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Strips thinking model output (<think> blocks) and markdown code fences from LLM JSON responses.
 */
function cleanJsonContent(content: string): string {
  let cleaned = content.trim();
  // Remove <think>...</think> blocks produced by reasoning models (e.g. nemotron-ultra)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Remove ```json or ``` fences
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  // Find the first { and last } to isolate the JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned.trim();
}

/**
 * Analyzes resume text against job description and requirements using the NVIDIA Nemotron API.
 * Uses native Node HTTPS for reliability. Falls back to heuristics on failure.
 */
export async function analyzeResume(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string
): Promise<Partial<CVAnalysis>> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    console.warn("[AI] NVIDIA_API_KEY not set. Using fallback analysis.");
    return generateFallbackAnalysis(resumeText, jobTitle, jobDescription);
  }

  const systemPrompt = `You are an expert AI recruiting assistant called TAO Recruit AI.
Your task is to carefully read the candidate's resume text, extract all structured information from it, and evaluate how well the candidate fits the specific job described.

CRITICAL RULES:
- Read the ACTUAL resume text provided. Do NOT make up or hallucinate any information.
- Extract the real name, email, phone, location, skills, education, and experience from the resume.
- Compare the candidate's ACTUAL skills and background against the ACTUAL job requirements.
- If the candidate's background does not match the job (e.g., a nurse applying for a web design role), the job_fit_score MUST be low (e.g., 5-20).
- If the candidate's background strongly matches the job, the score should be high (e.g., 80-95).
- Compute job_fit_score strictly between 0 and 100 based on real alignment.

You must respond ONLY with a valid JSON object. Do not include markdown code blocks, introductory text, or any text outside the JSON.

JSON structure:
{
  "full_name": "extracted from resume",
  "email": "extracted from resume",
  "phone": "extracted from resume",
  "location": "extracted from resume",
  "skills": ["actual skill 1 from resume", "actual skill 2"],
  "education": [
    {
      "institution": "actual institution name",
      "degree": "actual degree",
      "field": "actual field of study",
      "graduation_year": "actual year"
    }
  ],
  "certifications": ["actual cert 1"],
  "work_experience": [
    {
      "company": "actual company",
      "title": "actual job title",
      "start_date": "MM/YYYY",
      "end_date": "MM/YYYY or Present",
      "current": true,
      "description": "actual duties from resume"
    }
  ],
  "professional_summary": "honest summary based on what the resume actually says",
  "strengths": ["genuine strength relevant to THIS specific job"],
  "weaknesses": ["genuine gap or weakness for THIS specific job"],
  "recommendations": "specific, honest career advice for this candidate applying to this role",
  "job_fit_score": 0
}`;

  const userContent = `--- JOB ROLE ---
${jobTitle}

--- JOB DESCRIPTION ---
${jobDescription}

--- JOB REQUIREMENTS ---
${jobRequirements}

--- CANDIDATE RESUME TEXT (read carefully) ---
${resumeText.substring(0, 6000)}`;

  const requestBody = JSON.stringify({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    max_tokens: 2048,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  });

  console.log("[AI] Calling NVIDIA API for resume analysis...");
  console.log("[AI] Resume length:", resumeText.length, "chars");
  console.log("[AI] Job:", jobTitle);

  try {
    const rawResponse = await httpsPost(
      "integrate.api.nvidia.com",
      "/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      requestBody,
      60000
    );

    const result = JSON.parse(rawResponse);
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response content from NVIDIA API");
    }

    console.log("[AI] Raw LLM content (first 300 chars):", content.substring(0, 300));

    const cleanContent = cleanJsonContent(content);
    const parsed = JSON.parse(cleanContent);

    console.log("[AI] Analysis complete. Score:", parsed.job_fit_score, "| Name:", parsed.full_name);
    return parsed;
  } catch (err: any) {
    console.error("[AI] NVIDIA Resume Analysis failed:", err.message);
    console.warn("[AI] Falling back to heuristic analysis.");
    return generateFallbackAnalysis(resumeText, jobTitle, jobDescription);
  }
}

/**
 * Heuristics-based fallback resume parser (used only when NVIDIA API is unavailable).
 */
function generateFallbackAnalysis(
  resumeText: string,
  jobTitle: string,
  jobDescription: string
): Partial<CVAnalysis> {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  const emails = resumeText.match(emailRegex);
  const phones = resumeText.match(phoneRegex);

  const email = emails ? emails[0] : "candidate@tao.org";
  const phone = phones ? phones[0] : "+1 (555) 019-2834";

  let name = "Candidate User";
  const lines = resumeText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length > 0 && lines[0].length < 50 && !lines[0].includes("@") && !lines[0].match(/^\d/)) {
    name = lines[0];
  } else if (email && email !== "candidate@tao.org") {
    const parts = email.split("@")[0].split(/[._-]/);
    name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }

  // Scan for skills mentioned in both resume and job description
  const commonSkills = [
    "React", "TypeScript", "JavaScript", "Next.js", "Node.js", "Python", "SQL",
    "Supabase", "PostgreSQL", "HTML", "CSS", "Tailwind", "Git", "Docker", "AWS",
    "Java", "C#", "Machine Learning", "AI", "Figma", "Adobe XD", "Nursing",
    "Patient Care", "Medical", "Project Management", "Excel", "Word", "PowerPoint",
  ];

  const skills: string[] = [];
  commonSkills.forEach((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(resumeText)) {
      skills.push(skill);
    }
  });

  if (skills.length === 0) {
    skills.push("Communication", "Problem Solving");
  }

  // Score based on how many candidate skills match job description
  let matchCount = 0;
  skills.forEach((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(jobDescription)) {
      matchCount++;
    }
  });

  const jobFitScore = skills.length > 0 ? Math.min(80, Math.round((matchCount / skills.length) * 100)) : 30;

  return {
    full_name: name,
    email,
    phone,
    location: "Location not specified",
    skills,
    education: [],
    certifications: [],
    work_experience: [],
    professional_summary: `Candidate with skills in ${skills.slice(0, 4).join(", ")}. Note: Full AI analysis is currently unavailable.`,
    strengths: [`Proficient in ${skills.slice(0, 2).join(" and ")}`],
    weaknesses: ["Full AI analysis not available — manual review recommended."],
    recommendations: "Manual review by recruiter recommended as AI analysis is currently offline.",
    job_fit_score: jobFitScore,
    raw_json: {},
  };
}

/**
 * Generates the next screening interview question based on role requirements,
 * candidate CV summary, and interview chat history.
 */
export async function generateNextInterviewQuestion(
  jobTitle: string,
  jobDescription: string,
  candidateName: string,
  cvSummary: string,
  cvSkills: string[],
  chatHistory: { question: string; response: string }[],
  questionIndex: number
): Promise<{ question: string; isComplete: boolean; recommendedSeconds: number }> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    console.warn("[AI] NVIDIA_API_KEY not set. Using fallback interview question.");
    return generateFallbackInterviewQuestion(jobTitle, candidateName, chatHistory, questionIndex);
  }

  const systemPrompt = `You are a professional, empathetic, and sharp AI technical interviewer for TAO Recruit AI.
Your goal is to conduct a screening interview of candidate ${candidateName} for the role of ${jobTitle}.

You must respond ONLY with a valid JSON object. Do not include any markdown formatting, code blocks, or conversational filler. It must parse directly as JSON.

The JSON object must have this structure:
{
  "question": "Your next interview question text...",
  "recommendedSeconds": 60,
  "isComplete": false
}

Rules:
1. Determine if you have gathered enough information about the candidate's technical skills, experience, and communication suitability for the role. If you have gathered enough details (typically between 3 to 7 questions total depending on answer quality), set "isComplete" to true and set "question" to a warm closing remark thanking the candidate.
2. If the candidate's answers are too brief or lack detail, ask follow-up questions to probe deeper. If their answer is complete, move to another requirement from the CV or job description.
3. Set "recommendedSeconds" to an appropriate value between 30 and 120 depending on the question complexity (e.g., 45s for simple intro, 60-90s for standard technical, 90-120s for complex scenario questions).
4. Keep questions concise and professional (2-3 sentences max).
5. TONE: Friendly, conversational, and encouraging — like a human technical recruiter.
6. Reference specific details from the candidate's CV or previous answers to make it feel personal.`;

  const userContent = `--- JOB SPECIFICATIONS ---
Role: ${jobTitle}
Description: ${jobDescription}

--- CANDIDATE CV PROFILE ---
Summary: ${cvSummary}
Skills: ${cvSkills.join(", ")}

--- CONVERSATIONAL HISTORY ---
${chatHistory.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.response}`).join("\n\n")}

Generate interview question #${questionIndex + 1}:`;

  const requestBody = JSON.stringify({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 512,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  });

  console.log("[AI] Generating interview question #" + (questionIndex + 1) + " for", candidateName);

  try {
    const rawResponse = await httpsPost(
      "integrate.api.nvidia.com",
      "/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      requestBody,
      30000
    );

    const result = JSON.parse(rawResponse);
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty question content returned from NVIDIA API");
    }

    const cleanContent = cleanJsonContent(content);
    const parsed = JSON.parse(cleanContent);

    return {
      question: parsed.question || "",
      isComplete: !!parsed.isComplete,
      recommendedSeconds: Number(parsed.recommendedSeconds) || 60,
    };
  } catch (err: any) {
    console.error("[AI] NVIDIA Interview Question generation failed:", err.message);
    return generateFallbackInterviewQuestion(jobTitle, candidateName, chatHistory, questionIndex);
  }
}

/**
 * Local fallback question generator when NVIDIA LLM is unavailable.
 */
function generateFallbackInterviewQuestion(
  jobTitle: string,
  candidateName: string,
  chatHistory: { question: string; response: string }[],
  questionIndex: number
): { question: string; isComplete: boolean; recommendedSeconds: number } {
  const firstName = candidateName.split(" ")[0];
  const defaults: Record<number, string> = {
    0: `Hi ${firstName}, welcome to the screening interview for the ${jobTitle} role at TAO Recruit. To start, could you briefly introduce yourself and tell me what drew you to applying for this position?`,
    1: `Thank you! Can you walk me through a challenging project or problem you've tackled recently — what was your role, what did you do, and what was the outcome?`,
    2: `How do you typically approach collaborating with a team when there are competing priorities or unclear requirements?`,
    3: `In terms of your development or work process, what steps do you take to ensure quality and reliability in what you deliver?`,
    4: `Finally, is there a skill or area you're actively working to improve, and how are you going about it?`,
  };

  const question = defaults[questionIndex];
  if (!question) {
    return {
      question: `Thank you so much, ${firstName}! That's all the questions I have for now. We'll review your responses and get back to you shortly. Best of luck!`,
      isComplete: true,
      recommendedSeconds: 30,
    };
  }

  let recommendedSeconds = 60;
  if (questionIndex === 0) recommendedSeconds = 45;
  if (questionIndex === 1) recommendedSeconds = 90;

  return { question, isComplete: false, recommendedSeconds };
}
