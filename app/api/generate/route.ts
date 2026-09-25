import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface GenerateRequestBody {
  prompt: string;
  poseImage: string;
}

interface GenerateApiResponse {
  imageUrl?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<GenerateApiResponse>> {
  try {
    const { prompt, poseImage }: GenerateRequestBody = await req.json();

    if (!prompt || !poseImage) {
      return NextResponse.json(
        { error: "Both prompt and pose image are required." },
        { status: 400 }
      );
    }

    // Run OpenPose ControlNet via Replicate
    const output = (await replicate.run(
      "rossjanes/controlnet-openpose:31bfcc3d64194daae93d56a29be6a86c6b45d2ee5fc757d5cbba9ec7e923e200",
      {
        input: {
          image: poseImage,
          prompt: `1girl, visual novel sprite, high quality anime artwork, white background, ${prompt}`,
          negative_prompt: "disfigured, bad anatomy, complex background",
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }
    )) as string[];

    const imageUrl = output[1] || output[0];

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate sprite." },
      { status: 500 }
    );
  }
}