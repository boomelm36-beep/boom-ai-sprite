"use client";

import { useState, ChangeEvent } from "react";

interface ApiResponse {
  imageUrl?: string;
  error?: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState<string>("");
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPoseImage(reader.result);
      }
    };
  };

  const generateSprite = async (): Promise<void> => {
    if (!poseImage || !prompt) return;

    setGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, poseImage }),
      });

      const data: ApiResponse = await response.json();

      if (data.imageUrl) {
        setSpriteUrl(data.imageUrl);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while generating the image.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen p-10 bg-gray-900 text-white flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8">AI Visual Novel Sprite Maker</h1>

      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <label className="block mb-2 font-semibold">1. Upload Pose Guide</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="mb-4 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
        />

        <label className="block mb-2 font-semibold">2. Character Prompt</label>
        <textarea
          className="w-full p-2 mb-4 text-black rounded"
          rows={3}
          placeholder="e.g. wearing a school uniform, red hair, confident smile"
          value={prompt}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
        />

        <button
          onClick={generateSprite}
          disabled={!poseImage || !prompt || generating}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 p-2 rounded font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {generating ? "Generating Sprite..." : "Generate Character"}
        </button>
      </div>

      {spriteUrl && (
        <div className="mt-8 text-center">
          <h2 className="text-xl font-bold mb-4">Your Sprite:</h2>
          <img
            src={spriteUrl}
            alt="Generated Sprite"
            className="rounded-lg shadow-2xl max-w-md"
          />
        </div>
      )}
    </main>
  );
}