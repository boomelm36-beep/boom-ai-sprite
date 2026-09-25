import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { identityPrompt, poseName } = await req.json();

    if (!identityPrompt) {
      return NextResponse.json({ error: "Identity prompt is required." }, { status: 400 });
    }

    const fullPrompt = `1girl, visual novel character sprite, full body standing in ${poseName || "standing pose"}, masterwork anime artwork, clean white background, ${identityPrompt}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 999999);

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
    console.error("Apply Pose Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}