"use client";

import { useState, ChangeEvent } from "react";
import { ApiResponse } from "./api/generate-pose/route";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"pose" | "expression">("pose");

  // Shared State
  const [characterPrompt, setCharacterPrompt] = useState<string>(
    "silver hair, red eyes, school uniform"
  );

  // Pose Generator State
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [baseSprite, setBaseSprite] = useState<string | null>(null);
  const [loadingPose, setLoadingPose] = useState<boolean>(false);

  // Expression Generator State
  const [faceMask, setFaceMask] = useState<string | null>(null);
  const [expressionPrompt, setExpressionPrompt] = useState<string>(
    "blushing, embarrassed expression, open mouth"
  );
  const [expressionSprite, setExpressionSprite] = useState<string | null>(null);
  const [loadingExpression, setLoadingExpression] = useState<boolean>(false);

  const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") setter(reader.result);
    };
  };

  const handleGeneratePose = async () => {
    if (!poseImage) return;
    setLoadingPose(true);
    try {
      const res = await fetch("/api/generate-pose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: characterPrompt, poseImage }),
      });
      const data: ApiResponse = await res.json();
      if (data.imageUrl) setBaseSprite(data.imageUrl);
      else alert(data.error);
    } catch {
      alert("Failed to generate pose.");
    } finally {
      setLoadingPose(false);
    }
  };

  const handleGenerateExpression = async () => {
    if (!baseSprite || !faceMask) return;
    setLoadingExpression(true);
    try {
      const res = await fetch("/api/generate-expression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageUrl: baseSprite,
          faceMaskImage: faceMask,
          expressionPrompt,
          characterPrompt,
        }),
      });
      const data: ApiResponse = await res.json();
      if (data.imageUrl) setExpressionSprite(data.imageUrl);
      else alert(data.error);
    } catch {
      alert("Failed to generate expression variation.");
    } finally {
      setLoadingExpression(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Visual Novel Character Studio</h1>

      {/* Mode Navigation */}
      <div className="flex gap-4 mb-8 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("pose")}
          className={`px-6 py-2 rounded-md font-semibold transition ${
            activeTab === "pose" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          1. Pose Generator
        </button>
        <button
          onClick={() => setActiveTab("expression")}
          className={`px-6 py-2 rounded-md font-semibold transition ${
            activeTab === "expression" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          2. Expression Generator
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls Section */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Global Character Prompt
          </label>
          <textarea
            value={characterPrompt}
            onChange={(e) => setCharacterPrompt(e.target.value)}
            className="w-full p-2 mb-6 bg-gray-800 rounded border border-gray-700 text-white"
            rows={2}
          />

          {activeTab === "pose" ? (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-blue-400">Step 1: Body Pose</h2>
              <label className="block text-sm mb-1 text-gray-400">Upload Pose Skeleton/Guide</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setPoseImage)}
                className="mb-6 text-sm text-gray-400"
              />

              <button
                onClick={handleGeneratePose}
                disabled={!poseImage || loadingPose}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 p-3 rounded-lg font-bold"
              >
                {loadingPose ? "Generating Pose..." : "Generate Base Pose Sprite"}
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-blue-400">Step 2: Face Expression</h2>
              <label className="block text-sm mb-1 text-gray-400">Expression Prompt</label>
              <input
                type="text"
                value={expressionPrompt}
                onChange={(e) => setExpressionPrompt(e.target.value)}
                className="w-full p-2 mb-4 bg-gray-800 rounded border border-gray-700 text-white"
              />

              <label className="block text-sm mb-1 text-gray-400">
                Upload Face Mask (White = Face area, Black = Body)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setFaceMask)}
                className="mb-6 text-sm text-gray-400"
              />

              <button
                onClick={handleGenerateExpression}
                disabled={!baseSprite || !faceMask || loadingExpression}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 p-3 rounded-lg font-bold"
              >
                {loadingExpression ? "Swapping Expression..." : "Generate Expression Variant"}
              </button>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
          {activeTab === "pose" && (
            baseSprite ? (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Base Pose Sprite</p>
                <img src={baseSprite} alt="Base Pose" className="rounded-lg max-h-96 shadow-lg" />
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Generated base pose will appear here.</p>
            )
          )}

          {activeTab === "expression" && (
            expressionSprite ? (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Expression Variation</p>
                <img src={expressionSprite} alt="Expression Variant" className="rounded-lg max-h-96 shadow-lg" />
              </div>
            ) : baseSprite ? (
              <div className="text-center opacity-60">
                <p className="text-xs text-gray-400 mb-2">Active Base Image Target</p>
                <img src={baseSprite} alt="Base Target" className="rounded-lg max-h-96" />
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Generate a base pose sprite first in Step 1.</p>
            )
          )}
        </div>
      </div>
    </main>
  );
}