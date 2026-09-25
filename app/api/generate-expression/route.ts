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

    // Verified version hash for stability-ai/stable-diffusion-inpainting
    const output = await replicate.run(
      "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
      {
        input: {
          image: baseImageUrl,
          mask: faceMaskImage,
          prompt: `${expressionPrompt}, detailed anime facial features, ${characterPrompt}`,
          negative_prompt: "distorted face, extra eyes, bad eyes, blurry, dark background",
          num_inference_steps: 25,
          guidance_scale: 7.5,
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