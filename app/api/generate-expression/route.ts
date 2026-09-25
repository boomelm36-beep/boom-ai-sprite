import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, ExpressionRequestBody } from "@/types/sprite";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(",");
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/png";
  const buffer = Buffer.from(parts[1] || base64, "base64");
  return new Blob([buffer], { type: mime });
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { baseImageUrl, expressionPrompt, characterPrompt }: ExpressionRequestBody = await req.json();

    if (!baseImageUrl || !expressionPrompt) {
      return NextResponse.json(
        { error: "Base image and expression prompt are required." },
        { status: 400 }
      );
    }

    const imageBlob = base64ToBlob(baseImageUrl);

    const imageOutput = await client.imageToImage({
      model: "runwayml/stable-diffusion-v1-5",
      inputs: imageBlob,
      parameters: {
        prompt: `${expressionPrompt}, detailed anime facial features, ${characterPrompt}`,
        negative_prompt: "distorted face, extra eyes, bad eyes, blurry",
      },
    });

    let imageUrl: string;

    // TypeScript Type Narrowing for Blob | string
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
    console.error("HF Expression Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate expression variation." },
      { status: 500 }
    );
  }
}