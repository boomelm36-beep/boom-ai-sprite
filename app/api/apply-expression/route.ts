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
    const { poseSpriteUrl, expressionPrompt, identityPrompt } = await req.json();

    if (!poseSpriteUrl || !expressionPrompt) {
      return NextResponse.json(
        { error: "Pose sprite and expression prompt are required." },
        { status: 400 }
      );
    }

    const spriteBlob = base64ToBlob(poseSpriteUrl);

    const imageOutput = await client.imageToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: spriteBlob,
      parameters: {
        prompt: `close-up visual novel face avatar, ${expressionPrompt}, facial expression, ${identityPrompt}, detailed anime style, white background`,
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
    console.error("Apply Expression Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate expression variant." },
      { status: 500 }
    );
  }
}