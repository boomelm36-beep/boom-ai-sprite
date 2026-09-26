"use client";

import { useState, useEffect } from "react";
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

  const baseUrl = gpuApiUrl.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `photorealistic raw photo, realistic character portrait, highly detailed face and skin texture, 8k resolution, studio lighting, clean solid white background, ${prompt}`,
      negative_prompt:
        "anime, cartoon, illustration, 3d render, painting, drawing, low quality, bad anatomy, distorted face, oversaturated, dark background",
      steps: 10,
      width: width,
      height: height,
      cfg_scale: 1.5,
      sampler_name: "Euler",
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
  const [gpuUrl, setGpuUrl] = useState("http://127.0.0.1:7860");

  // Character Roster State & Persistence Flag
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"create" | "pose" | "expression">("create");

  // Create Form Inputs
  const [charName, setCharName] = useState("");
  const [identityPrompt, setIdentityPrompt] = useState(
    "24 year old woman, wavy brown hair, hazel eyes, natural freckles, navy blazer"
  );
  const [poseName, setPoseName] = useState("crossed arms, confident stance");
  const [expressionPrompt, setExpressionPrompt] = useState("slight warm smile");

  // Edit State
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdentityPrompt, setEditIdentityPrompt] = useState("");

  const [loading, setLoading] = useState(false);

  const activeCharacter = characters.find((c) => c.id === selectedCharacterId);

  // -----------------------------------------------------------
  // LocalStorage Persistence (Loads on mount, saves on change)
  // -----------------------------------------------------------
  useEffect(() => {
    const savedCharacters = localStorage.getItem("vn_studio_characters");
    if (savedCharacters) {
      try {
        const parsed = JSON.parse(savedCharacters);
        setCharacters(parsed);
        if (parsed.length > 0) {
          setSelectedCharacterId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load characters from localStorage", e);
      }
    }
    const savedUrl = localStorage.getItem("vn_studio_gpu_url");
    if (savedUrl) setGpuUrl(savedUrl);

    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("vn_studio_characters", JSON.stringify(characters));
    }
  }, [characters, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("vn_studio_gpu_url", gpuUrl);
    }
  }, [gpuUrl, isMounted]);

  // -----------------------------------------------------------
  // Character CRUD Operations
  // -----------------------------------------------------------

  // 1. Create Character Hero Image
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

  // 2. Start Editing Character Metadata
  const handleStartEdit = (char: CharacterProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCharId(char.id);
    setEditName(char.name);
    setEditIdentityPrompt(char.identityPrompt);
  };

  // 3. Save Edited Character Metadata
  const handleSaveEdit = () => {
    if (!editingCharId) return;
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === editingCharId
          ? { ...c, name: editName, identityPrompt: editIdentityPrompt }
          : c
      )
    );
    setEditingCharId(null);
  };

  // 4. Delete Character
  const handleDeleteCharacter = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this character?")) return;

    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacterId === charId) {
      const remaining = characters.filter((c) => c.id !== charId);
      setSelectedCharacterId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // -----------------------------------------------------------
  // Sprite Generation Operations
  // -----------------------------------------------------------

  // Generate New Pose Sprite
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

  // Generate Expression Variant
  const handleApplyExpression = async (poseId: string) => {
    if (!activeCharacter) return;
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

  if (!isMounted) return null; // Avoid hydration mismatch on initial load

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
              placeholder="http://127.0.0.1:7860"
              className="w-full p-2 text-xs bg-gray-800 rounded border border-gray-700 text-blue-400 font-mono focus:outline-none focus:border-blue-500"
            />
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
                    className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border transition ${
                      selectedCharacterId === c.id
                        ? "border-blue-500 bg-blue-950/40"
                        : "border-gray-800 bg-gray-800/50 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={c.heroImageUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-700 flex-shrink-0"
                      />
                      <div className="truncate">
                        <p className="font-bold truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.poses.length} Poses</p>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleStartEdit(c, e)}
                        title="Edit Character"
                        className="p-1.5 text-xs text-gray-400 hover:text-blue-400 rounded transition"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDeleteCharacter(c.id, e)}
                        title="Delete Character"
                        className="p-1.5 text-xs text-gray-400 hover:text-red-400 rounded transition"
                      >
                        🗑️
                      </button>
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

          {/* Edit Modal / Inline Panel */}
          {editingCharId && (
            <div className="bg-blue-950/40 p-6 rounded-xl border border-blue-500 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">Edit Character Profile</h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Identity Prompt
                </label>
                <textarea
                  value={editIdentityPrompt}
                  onChange={(e) => setEditIdentityPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingCharId(null)}
                  className="px-4 bg-gray-800 hover:bg-gray-700 py-2 rounded text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                {loading ? "Generating Character..." : "Generate Character Anchor"}
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
                  placeholder="e.g. crossed arms, waving hello"
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