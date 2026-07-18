import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/webm";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
      },
    });

    const prompt = `You are an expert audio transcription model for the TAO Recruit AI hiring platform.
Your task is to transcribe this audio recording of a candidate's interview response with absolute precision.

STRICT INSTRUCTIONS:
1. Output ONLY the final transcribed text. Do NOT include any intro, conversational fillers, or explanations.
2. Clean up natural speech filler words: remove "uh", "um", "ah", "like", and "you know".
3. Clean up speech stutters, repetitions, and false starts (e.g. if the candidate says "I want to I want to discuss", transcribe it as "I want to discuss").
4. Ignore background noise, rustles, and minor side chatter.
5. If the candidate complains about the interface or says things like "it's not working" or "is this recording?", remove that meta-chatter and transcribe only the actual interview response.
6. Provide proper capitalization, spelling, and grammar/punctuation formatting to make it clean and readable.
7. If the audio is completely silent, contains no spoken words, or only non-human noises, output exactly: (No verbal response captured)`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const transcript = result.response.text().trim();
    return NextResponse.json({ transcript });
  } catch (err: any) {
    console.error("[Transcribe API Error] Audio transcription failed:", err);
    return NextResponse.json({ error: err.message || "Failed to transcribe audio" }, { status: 500 });
  }
}
