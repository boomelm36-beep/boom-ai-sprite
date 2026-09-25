import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, PoseRequestBody } from "@/types/sprite";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt }: PoseRequestBody = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // FLUX.1-schnell is active on HF's free serverless API
    const imageOutput = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: `1girl, visual novel character sprite, anime style, full body, white background, ${prompt}`,
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
    console.error("HF Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}