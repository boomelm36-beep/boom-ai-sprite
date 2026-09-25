import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, ExpressionRequestBody } from "@/types/sprite";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { baseImageUrl, faceMaskImage, expressionPrompt, characterPrompt }: ExpressionRequestBody = await req.json();

    if (!baseImageUrl || !expressionPrompt || !faceMaskImage) {
      return NextResponse.json(
        { error: "Base image, face mask, and expression prompt are required." },
        { status: 400 }
      );
    }

    // Using stability-ai/stable-diffusion-inpainting
    const output = await replicate.run(
      "stability-ai/stable-diffusion-inpainting:95b2c7828604099430f351d586b9d9c8824e5088265d29b3071c561376326e5e",
      {
        input: {
          image: baseImageUrl,
          mask: faceMaskImage,
          prompt: `${expressionPrompt}, detailed anime facial features, ${characterPrompt}`,
          negative_prompt: "distorted face, extra eyes, bad eyes, blurry, dark background",
          num_inference_steps: 25,
        },
      }
    );

    const imageUrl = Array.isArray(output)
      ? String(output[0])
      : (output as unknown as string);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Expression Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate expression variation." },
      { status: 500 }
    );
  }
}