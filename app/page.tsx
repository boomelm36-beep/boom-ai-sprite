"use client";

import { useState } from "react";
import { CharacterProfile } from "@/types/character";

// Helper function to send txt2img requests directly to your local SD WebUI Forge API
async function fetchLocalForgeSprite(
  gpuApiUrl: string,
  prompt: string,
  width = 512,
  height = 768
): Promise<string> {
  if (!gpuApiUrl) {
    throw new Error("Please enter a valid Local GPU Backend URL.");
  }

  // Clean trailing slashes
  const baseUrl = gpuApiUrl.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `masterpiece, best quality, 1girl, visual novel character sprite, anime style, clean white background, ${prompt}`,
      negative_prompt: "low quality, worst quality, bad anatomy, distorted, ugly, dark background",
      steps: 20,
      width: width,
      height: height,
      cfg_scale: 7,
      sampler_name: "Euler a",
    }),
  });

  if (!response.ok) {
    throw new Error(
      "Failed to connect to GPU server. Check that WebUI Forge is running and your GPU URL is correct."
    );
  }

  const data = await response.json();
  const base64Image = data.images?.[0];

  if (!base64Image) {
    throw new Error("No image data returned from WebUI Forge.");
  }

  return `data:image/png;base64,${base64Image}`;
}

export default function Home() {
  // Local GPU API Endpoint
  const [gpuUrl, setGpuUrl] = useState("https://0d9ea4f5010b64eb50.gradio.live");

  // Character Roster State
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"create" | "pose" | "expression">("create");

  // Form Inputs
  const [charName, setCharName] = useState("");
  const [identityPrompt, setIdentityPrompt] = useState(
    "long silver hair, sharp red eyes, navy blazer"
  );
  const [poseName, setPoseName] = useState("crossed arms, confident stance");
  const [expressionPrompt, setExpressionPrompt] = useState(
    "happy smiling expression, blushing cheeks"
  );

  const [loading, setLoading] = useState(false);

  const activeCharacter = characters.find((c) => c.id === selectedCharacterId);

  // 1. Generate Character Hero Image via Local GPU
  const handleCreateCharacter = async () => {
    if (!charName || !identityPrompt) return;
    setLoading(true);
    try {
      const fullPrompt = `front view portrait, ${identityPrompt}`;
      const imageUrl = await fetchLocalForgeSprite(gpuUrl, fullPrompt, 512, 768);

      const newChar: CharacterProfile = {
        id: Date.now().toString(),
        name: charName,
        identityPrompt,
        heroImageUrl: imageUrl,
        poses: [],
      };

      setCharacters((prev) => [...prev, newChar]);
      setSelectedCharacterId(newChar.id);
      setActiveTab("pose");
      setCharName("");
    } catch (err: any) {
      alert(err?.message || "Failed to generate character.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate New Pose Sprite via Local GPU
  const handleApplyPose = async () => {
    if (!activeCharacter) return;
    setLoading(true);
    try {
      const fullPrompt = `full body standing in ${
        poseName || "standing pose"
      }, ${activeCharacter.identityPrompt}`;

      const imageUrl = await fetchLocalForgeSprite(gpuUrl, fullPrompt, 512, 768);

      const newPose = {
        id: Date.now().toString(),
        poseName,
        spriteUrl: imageUrl,
        expressions: [],
      };

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === activeCharacter.id ? { ...c, poses: [...c.poses, newPose] } : c
        )
      );
      setActiveTab("expression");
    } catch (err: any) {
      alert(err?.message || "Failed to generate pose sprite.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Generate Expression Variant via Local GPU
  const handleApplyExpression = async (poseId: string) => {
    if (!activeCharacter) return;
    const targetPose = activeCharacter.poses.find((p) => p.id === poseId);
    if (!targetPose) return;

    setLoading(true);
    try {
      const fullPrompt = `close-up face avatar, ${expressionPrompt}, facial expression, ${activeCharacter.identityPrompt}`;

      const imageUrl = await fetchLocalForgeSprite(gpuUrl, fullPrompt, 512, 512);

      const newExpr = {
        id: Date.now().toString(),
        name: expressionPrompt,
        imageUrl,
      };

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === activeCharacter.id
            ? {
                ...c,
                poses: c.poses.map((p) =>
                  p.id === poseId
                    ? { ...p, expressions: [...p.expressions, newExpr] }
                    : p
                ),
              }
            : c
        )
      );
    } catch (err: any) {
      alert(err?.message || "Failed to generate expression.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Visual Novel Character Studio
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar: GPU Config & Character Roster */}
        <div className="space-y-6">
          {/* GPU Connection Settings */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Local GPU Backend URL
            </label>
            <input
              type="text"
              value={gpuUrl}
              onChange={(e) => setGpuUrl(e.target.value)}
              placeholder="http://127.0.0.1:7860 or https://xxxx.gradio.live"
              className="w-full p-2 text-xs bg-gray-800 rounded border border-gray-700 text-blue-400 font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              For local testing use <code className="text-gray-400">http://127.0.0.1:7860</code>. For Netlify deployment paste your <code className="text-gray-400">https://</code> tunnel URL.
            </p>
          </div>

          {/* Roster List */}
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <h2 className="text-xl font-semibold mb-4">Character Roster</h2>
            {characters.length === 0 ? (
              <p className="text-gray-500 text-sm">No characters created yet.</p>
            ) : (
              <div className="space-y-3">
                {characters.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCharacterId(c.id)}
                    className={`p-3 rounded-lg flex items-center gap-4 cursor-pointer border transition ${
                      selectedCharacterId === c.id
                        ? "border-blue-500 bg-blue-950/40"
                        : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                    }`}
                  >
                    <img
                      src={c.heroImageUrl}
                      alt={c.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-700"
                    />
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.poses.length} Poses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Studio Main Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
                activeTab === "create"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              1. New Character
            </button>
            <button
              onClick={() => setActiveTab("pose")}
              disabled={!activeCharacter}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                activeTab === "pose"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              2. Add Pose
            </button>
            <button
              onClick={() => setActiveTab("expression")}
              disabled={!activeCharacter || activeCharacter.poses.length === 0}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                activeTab === "expression"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              3. Face Expressions
            </button>
          </div>

          {/* Panel 1: Create Character */}
          {activeTab === "create" && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">
                Step 1: Create Hero Anchor
              </h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Elena"
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Identity Prompt (Features & Clothing)
                </label>
                <textarea
                  value={identityPrompt}
                  onChange={(e) => setIdentityPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleCreateCharacter}
                disabled={loading || !charName}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 py-3 rounded-lg font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Generating Identity Anchor on RTX 4060..." : "Generate Character Anchor"}
              </button>
            </div>
          )}

          {/* Panel 2: Apply Pose */}
          {activeTab === "pose" && activeCharacter && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">
                Step 2: Pose Studio ({activeCharacter.name})
              </h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Pose Description</label>
                <input
                  type="text"
                  value={poseName}
                  onChange={(e) => setPoseName(e.target.value)}
                  placeholder="e.g. crossed arms, waving hello, sitting"
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleApplyPose}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 py-3 rounded-lg font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Generating Pose Sprite on RTX 4060..." : "Generate Pose Sprite"}
              </button>
            </div>
          )}

          {/* Panel 3: Expressions & Gallery */}
          {activeTab === "expression" && activeCharacter && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-6">
              <h2 className="text-lg font-bold text-blue-400">
                Step 3: Expressions for {activeCharacter.name}
              </h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Target Expression</label>
                <input
                  type="text"
                  value={expressionPrompt}
                  onChange={(e) => setExpressionPrompt(e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-6">
                {activeCharacter.poses.map((pose) => (
                  <div
                    key={pose.id}
                    className="p-4 bg-gray-800/60 rounded-lg border border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-blue-300">
                        Pose: {pose.poseName}
                      </h3>
                      <button
                        onClick={() => handleApplyExpression(pose.id)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5 rounded font-bold transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        + Generate Expression
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      <div className="flex-shrink-0 text-center">
                        <img
                          src={pose.spriteUrl}
                          alt="Base Pose"
                          className="w-28 h-36 object-cover rounded border border-gray-600"
                        />
                        <span className="text-xs text-gray-400 mt-1 block">Base Pose</span>
                      </div>
                      {pose.expressions.map((exp) => (
                        <div key={exp.id} className="flex-shrink-0 text-center">
                          <img
                            src={exp.imageUrl}
                            alt={exp.name}
                            className="w-28 h-36 object-cover rounded border border-blue-500"
                          />
                          <span className="text-xs text-gray-300 mt-1 block truncate w-28">
                            {exp.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}