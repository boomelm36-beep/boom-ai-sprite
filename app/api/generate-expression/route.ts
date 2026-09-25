import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, ExpressionRequestBody } from "@/types/sprite";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { expressionPrompt, characterPrompt }: ExpressionRequestBody = await req.json();

    if (!expressionPrompt) {
      return NextResponse.json(
        { error: "Expression prompt is required." },
        { status: 400 }
      );
    }

    const imageOutput = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: `detailed anime face avatar close-up, ${expressionPrompt}, ${characterPrompt}, visual novel sprite style, white background`,
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
    console.error("HF Expression Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate expression variation." },
      { status: 500 }
    );
  }
}