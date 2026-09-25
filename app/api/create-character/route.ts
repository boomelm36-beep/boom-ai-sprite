import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Character prompt is required." }, { status: 400 });
    }

    const imageOutput = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: `1girl, character concept portrait, front view, detailed anime style, ${prompt}, neutral expression, clean white background`,
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
    console.error("Create Character Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate character hero image." },
      { status: 500 }
    );
  }
}