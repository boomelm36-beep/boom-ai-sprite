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

    // Return the direct Pollinations image CDN URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=832&height=1216&seed=${seed}&nologo=true&model=flux`;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Create Character Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate character." },
      { status: 500 }
    );
  }
}