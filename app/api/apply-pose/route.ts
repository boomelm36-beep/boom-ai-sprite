import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/types/character";

const client = new InferenceClient(process.env.HF_ACCESS_TOKEN);

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { identityPrompt, poseName } = await req.json();

    if (!identityPrompt) {
      return NextResponse.json(
        { error: "Identity prompt is required." },
        { status: 400 }
      );
    }

    // Use textToImage anchored by character identity description
    const imageOutput = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: `visual novel character sprite, full body standing in ${poseName || "standing pose"}, ${identityPrompt}, detailed anime style, clean white background`,
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