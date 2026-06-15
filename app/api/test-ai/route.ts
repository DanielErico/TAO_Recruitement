import { NextResponse } from "next/server";
import https from "https";

export const dynamic = "force-dynamic";

function httpsPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs = 60000
): Promise<{ statusCode: number; body: string }> {
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
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data }));
    });

    req.on("timeout", () => req.destroy(new Error("Request timed out after " + timeoutMs + "ms")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * GET /api/test-ai
 * Full diagnostic: simulates the exact JSON analysis request the CV analysis route makes.
 * Remove this route once AI analysis is confirmed working.
 */
export async function GET() {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: "❌ FAIL",
      reason: "NVIDIA_API_KEY environment variable is not set on this deployment.",
    }, { status: 500 });
  }

  // Simulate the exact same request structure AND token count as analyzeResume()
  // This will expose timeout issues that the simple 50-token test hides
  const body = JSON.stringify({
    model: "meta/llama-3.1-8b-instruct",
    messages: [
      {
        role: "system",
        content: "You are a JSON API. Return ONLY a valid JSON object with this exact structure, no other text:\n{\"full_name\": \"John Smith\", \"email\": \"john@example.com\", \"phone\": \"+1-555-0100\", \"location\": \"New York, NY\", \"skills\": [\"JavaScript\", \"React\", \"Node.js\"], \"education\": [{\"institution\": \"MIT\", \"degree\": \"BSc\", \"field\": \"Computer Science\", \"graduation_year\": \"2020\"}], \"certifications\": [], \"work_experience\": [{\"company\": \"Acme Corp\", \"title\": \"Developer\", \"start_date\": \"01/2021\", \"end_date\": \"Present\", \"current\": true, \"description\": \"Built web apps\"}], \"professional_summary\": \"Experienced developer.\", \"strengths\": [\"Strong JS skills\"], \"weaknesses\": [\"Limited DevOps\"], \"recommendations\": \"Good fit.\", \"job_fit_score\": 82}",
      },
      {
        role: "user",
        content: "Return the JSON object now.",
      },
    ],
    temperature: 0.1,
    max_tokens: 1200,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  });

  const startTime = Date.now();

  try {
    const { statusCode, body: rawBody } = await httpsPost(
      "integrate.api.nvidia.com",
      "/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      30000
    );

    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({
        status: "❌ PARSE ERROR",
        httpStatus: statusCode,
        rawResponse: rawBody.substring(0, 500),
        keyPrefix: apiKey.substring(0, 12) + "...",
      }, { status: 500 });
    }

    if (statusCode >= 200 && statusCode < 300) {
      const elapsed = Date.now() - startTime;
      const content = parsed.choices?.[0]?.message?.content ?? "(empty)";
      return NextResponse.json({
        status: "✅ SUCCESS",
        httpStatus: statusCode,
        elapsedMs: elapsed,
        modelReply: content.substring(0, 300),
        tokenCount: parsed.usage?.completion_tokens ?? "unknown",
        note: elapsed > 8000
          ? "⚠️ Response took >8s — WILL TIMEOUT on Vercel free tier (10s limit). Upgrade to Pro or use a faster model."
          : "Response is fast enough for Vercel free tier.",
        keyPrefix: apiKey.substring(0, 12) + "...",
      });
    } else {
      return NextResponse.json({
        status: "❌ API ERROR",
        httpStatus: statusCode,
        nvidiaError: parsed,
        keyPrefix: apiKey.substring(0, 12) + "...",
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({
      status: "❌ NETWORK/TIMEOUT ERROR",
      error: err.message,
      keyPrefix: apiKey.substring(0, 12) + "...",
    }, { status: 500 });
  }
}
