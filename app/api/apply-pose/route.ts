import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/png";
  const buffer = Buffer.from(parts[1] || base64, "base64");
  return new Blob([buffer], { type: mime });
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { heroImageUrl, identityPrompt, poseName } = await req.json();

    if (!heroImageUrl || !identityPrompt) {
      return NextResponse.json(
        { error: "Hero image and identity prompt are required." },
        { status: 400 }
      );
    }

    const heroBlob = base64ToBlob(heroImageUrl);

    const imageOutput = await client.imageToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: heroBlob,
      parameters: {
        prompt: `visual novel character sprite, full body standing in ${poseName || "new pose"}, ${identityPrompt}, anime style, white background`,
      },
    });

    let imageUrl: string;
    if (typeof imageOutput === "string") {
      imageUrl = imageOutput;
    } else {
      const blob = imageOutput as Blob;
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    }

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Apply Pose Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}