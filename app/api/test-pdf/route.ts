import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
const { PDFParse } = require("pdf-parse");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = "https://khtyudpcrucqgfxhgufg.supabase.co/storage/v1/object/public/resumes/4493af31-8262-4dd3-b49a-809452b54aad/1781614703772-pxr05ne.pdf";
  
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let resultText = "";
    let parseError = null;
    
    try {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      resultText = data.text || "";
    } catch (err: any) {
      parseError = {
        message: err.message,
        stack: err.stack,
        name: err.name
      };
    }
    
    return NextResponse.json({
      success: parseError === null,
      textLength: resultText.length,
      sampleText: resultText.substring(0, 200),
      error: parseError
    });
  } catch (err: any) {
    return NextResponse.json({
      error: "Fetch failed",
      details: err.message
    }, { status: 500 });
  }
}
