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

  // Simulate the exact same request structure as analyzeResume()
  const body = JSON.stringify({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      {
        role: "system",
        content: "You are a JSON API. Respond ONLY with this exact JSON object, no other text:\n{\"status\": \"ok\", \"model\": \"working\"}",
      },
      {
        role: "user",
        content: "Return the JSON.",
      },
    ],
    temperature: 0.1,
    max_tokens: 50,
    stream: false,
    chat_template_kwargs: { enable_thinking: false },
  });

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
      const content = parsed.choices?.[0]?.message?.content ?? "(empty)";
      return NextResponse.json({
        status: "✅ SUCCESS",
        httpStatus: statusCode,
        modelReply: content,
        keyPrefix: apiKey.substring(0, 12) + "...",
        note: "If modelReply contains valid JSON, the full AI analysis should work.",
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
