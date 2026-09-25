import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const fullPrompt = `1girl, visual novel character sprite, front view portrait, masterwork realistic artwork, clean white background, ${prompt}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);

    // Fast 1-2 second generation using model=turbo at 512x768
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&seed=${seed}&nologo=true&model=turbo`;

    const res = await fetch(pollinationsUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Pollinations service error: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Create Character Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate character." },
      { status: 500 }
    );
  }
}