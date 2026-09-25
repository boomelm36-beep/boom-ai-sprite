import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface ExpressionRequestBody {
  baseImageUrl: string;
  faceMaskImage: string;
  expressionPrompt: string;
  characterPrompt: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { baseImageUrl, faceMaskImage, expressionPrompt, characterPrompt }: ExpressionRequestBody = await req.json();

    if (!baseImageUrl || !expressionPrompt) {
      return NextResponse.json(
        { error: "Base image and expression prompt are required." },
        { status: 400 }
      );
    }

    // Inpaint the face region to swap expressions while preserving body & pose
    const output = (await replicate.run(
      "sepal/sdxl-inpainting:aca001c8b137114d5e594c68f7084ae6d82f364758aab8d997b233e8ef3c4d93",
      {
        input: {
          image: baseImageUrl,
          mask: faceMaskImage,
          prompt: `${expressionPrompt}, facial expression, detailed anime face, ${characterPrompt}`,
          negative_prompt: "distorted face, extra eyes, bad eyes, blurry",
          prompt_strength: 0.7, // Preserves face placement while altering expression
        },
      }
    )) as string[];

    const imageUrl = Array.isArray(output) ? output[0] : (output as unknown as string);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Expression Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate expression variation." },
      { status: 500 }
    );
  }
}