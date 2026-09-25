import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, poseImage } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN environment variable is not set." },
        { status: 500 }
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

    const imageUrl = Array.isArray(output) ? output[0] : output;
    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate sprite" },
      { status: 500 }
    );
  }
}