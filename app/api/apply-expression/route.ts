import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { expressionPrompt, identityPrompt } = await req.json();

    if (!expressionPrompt || !identityPrompt) {
      return NextResponse.json(
        { error: "Expression prompt and identity prompt are required." },
        { status: 400 }
      );
    }

    const fullPrompt = `1girl, close-up face avatar, visual novel character sprite, ${expressionPrompt}, facial expression, masterwork anime artwork, clean white background, ${identityPrompt}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);

    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}&nologo=true&model=turbo`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(pollinationsUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Pollinations service returned status ${res.status}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Apply Expression Error:", error);
    const errorMessage = error?.name === "AbortError" 
      ? "Generation timed out. Please try again." 
      : (error?.message || "Failed to generate expression variation.");

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}