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

    // Using jagilley/controlnet-pose model
    const output = await replicate.run(
      "jagilley/controlnet-pose:e3f5c08d7d157d9e7592931e9c20a9a4b8eb25c56d78ec3a579bf6316fa9c878",
      {
        input: {
          image: poseImage,
          prompt: `1girl, visual novel character sprite, anime style, white background, ${prompt}`,
          negative_prompt: "disfigured, bad hands, low resolution, dark background, complex background",
          num_inference_steps: 25,
        },
      }
    );

    const imageUrl = Array.isArray(output)
      ? String(output[0])
      : (output as unknown as string);

    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Pose Generation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}