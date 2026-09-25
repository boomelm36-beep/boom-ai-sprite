"use client";

import { useState } from "react";
import { CharacterProfile } from "@/types/character";

// Client-side helper function to fetch directly from Pollinations
async function fetchPollinationsImage(
  prompt: string,
  width = 512,
  height = 768
): Promise<string> {
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=turbo`;

  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error(
      "Pollinations rate limit reached on your IP. Please wait 10 seconds and try again."
    );
  }

  if (!response.ok) {
    throw new Error(`Pollinations service returned status ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export default function Home() {
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

  // 1. Generate Character Hero Image (Client-Side)
  const handleCreateCharacter = async () => {
    if (!charName || !identityPrompt) return;
    setLoading(true);
    try {
      const fullPrompt = `1girl, visual novel character sprite, front view portrait, masterwork anime artwork, clean white background, ${identityPrompt}`;
      const imageUrl = await fetchPollinationsImage(fullPrompt, 512, 768);

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

  // 2. Generate New Pose Sprite (Client-Side)
  const handleApplyPose = async () => {
    if (!activeCharacter) return;
    setLoading(true);
    try {
      const fullPrompt = `1girl, visual novel character sprite, full body standing in ${
        poseName || "standing pose"
      }, masterwork anime artwork, clean white background, ${activeCharacter.identityPrompt}`;

      const imageUrl = await fetchPollinationsImage(fullPrompt, 512, 768);

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

  // 3. Generate Expression Variant (Client-Side)
  const handleApplyExpression = async (poseId: string) => {
    if (!activeCharacter) return;
    const targetPose = activeCharacter.poses.find((p) => p.id === poseId);
    if (!targetPose) return;

    setLoading(true);
    try {
      const fullPrompt = `1girl, close-up face avatar, visual novel character sprite, ${expressionPrompt}, facial expression, masterwork anime artwork, clean white background, ${activeCharacter.identityPrompt}`;

      const imageUrl = await fetchPollinationsImage(fullPrompt, 512, 512);

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
        {/* Sidebar: Character Roster */}
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

        {/* Studio Controls */}
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
              <h2 className="text-lg font-bold text-blue-400">Step 1: Create Hero Anchor</h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Elena"
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
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
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>
              <button
                onClick={handleCreateCharacter}
                disabled={loading || !charName}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 py-3 rounded-lg font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Generating Identity Anchor..." : "Generate Character Anchor"}
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
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>
              <button
                onClick={handleApplyPose}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 py-3 rounded-lg font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Generating Pose Sprite..." : "Generate Pose Sprite"}
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
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
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