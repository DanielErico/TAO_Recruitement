import { NextResponse } from "next/server";
import https from "https";

export const dynamic = "force-dynamic";

function httpsPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs = 30000
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
        resolve(JSON.stringify({ statusCode: res.statusCode, body: data }));
      });
    });

    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * GET /api/test-ai
 * Tests whether the NVIDIA API key is configured and reachable from this deployment.
 * Remove this route once confirmed working.
 */
export async function GET() {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      status: "❌ FAIL",
      reason: "NVIDIA_API_KEY environment variable is not set on this deployment.",
    }, { status: 500 });
  }

  const body = JSON.stringify({
    model: "nvidia/llama-3.1-nemotron-70b-instruct",
    messages: [
      { role: "user", content: "Reply with only the word: WORKING" },
    ],
    temperature: 0.1,
    max_tokens: 10,
    stream: false,
  });

  try {
    const raw = await httpsPost(
      "integrate.api.nvidia.com",
      "/v1/chat/completions",
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
      20000
    );

    const parsed = JSON.parse(raw);
    const httpStatus = parsed.statusCode;
    const responseBody = JSON.parse(parsed.body);

    if (httpStatus >= 200 && httpStatus < 300) {
      const reply = responseBody.choices?.[0]?.message?.content ?? "(empty)";
      return NextResponse.json({
        status: "✅ SUCCESS",
        httpStatus,
        modelReply: reply,
        keyPrefix: apiKey.substring(0, 12) + "...",
      });
    } else {
      return NextResponse.json({
        status: "❌ API ERROR",
        httpStatus,
        nvidiError: responseBody,
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
