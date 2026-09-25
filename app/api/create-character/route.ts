import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // Build quality prompt anchors
    const fullPrompt = `1girl, visual novel character sprite, front view portrait, masterwork anime artwork, clean white background, ${prompt}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);

    const url = `https://pollinations.ai/prompt/${encodedPrompt}?width=832&height=1216&seed=${seed}&nologo=true&model=flux`;

    // Fetch image directly on server side
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch image from Pollinations service.");
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