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

    // Verified version hash for jagilley/controlnet-pose
    const output = await replicate.run(
      "jagilley/controlnet-pose:0304f7f774ba7341ef754231f794b1ba3d129e3c46af3022241325ae0c50fb99",
      {
        input: {
          image: poseImage,
          prompt: `1girl, visual novel character sprite, anime style, white background, ${prompt}`,
          a_prompt: "best quality, extremely detailed, masterwork",
          n_prompt: "disfigured, bad hands, low resolution, dark background, complex background, blurry",
          ddim_steps: 20,
          scale: 9,
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