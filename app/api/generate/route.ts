import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface PoseRequestBody {
  prompt: string;
  poseImage: string;
  seed?: number;
}

export interface ApiResponse {
  imageUrl?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { prompt, poseImage, seed }: PoseRequestBody = await req.json();

    if (!prompt || !poseImage) {
      return NextResponse.json(
        { error: "Prompt and Pose Image are required." },
        { status: 400 }
      );
    }

    // Generate base character body using OpenPose ControlNet
    const output = (await replicate.run(
      "lucataco/sdxl-controlnet-openpose:d63e0b238b2d963d90348e2dad19830fbe372a7a43d90d234b2b63cae76d4397",
      {
        input: {
          image: poseImage,
          prompt: `1girl, visual novel character sprite, full body, anime style, white background, ${prompt}`,
          negative_prompt: "disfigured, bad hands, low resolution, dark background, complex background",
          guidance_scale: 7.5,
          ...(seed !== undefined && { seed }),
        },
      }
    )) as string[];

    const imageUrl = Array.isArray(output) ? output[0] : (output as unknown as string);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Pose Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate pose sprite." },
      { status: 500 }
    );
  }
}