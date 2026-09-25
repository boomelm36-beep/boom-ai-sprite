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

    const url = `https://pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${seed}&nologo=true&model=flux`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to fetch expression from Pollinations service.");
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Apply Expression Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate expression variation." },
      { status: 500 }
    );
  }
}