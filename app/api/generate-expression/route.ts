import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, PoseRequestBody } from "@/types/sprite";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt, poseImage }: PoseRequestBody = await req.json();

    if (!prompt || !poseImage) {
      return NextResponse.json(
        { error: "Prompt and Pose Image are required." },
        { status: 400 }
      );
    }

    const output = await replicate.run(
      "thibaud/controlnet-openpose:230716d31db87097071e4f57ae458c03e454f855a7d0e3a4e12e3e56598c2f1f",
      {
        input: {
          image: poseImage,
          prompt: `1girl, visual novel sprite, high quality anime artwork, white background, ${prompt}`,
          negative_prompt: "disfigured, low quality, complex background",
          num_inference_steps: 20,
        },
      }
    );

    const imageUrl = Array.isArray(output) ? output[0] : (output as string);
    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Pose Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}