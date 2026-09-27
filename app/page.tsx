"use client";

import { useState, useEffect } from "react";
import { CharacterProfile } from "@/types/character";

// Negative prompt presets by gender
const MALE_NEGATIVE_PRESET =
  "vagina, vulva, breasts, boobs, female, woman, girl, futanari, anime, cartoon, illustration, 3d render, painting, drawing, low quality, bad anatomy, distorted face, oversaturated, dark background";

const FEMALE_NEGATIVE_PRESET =
  "penis, cock, male, man, boy, beard, mustache, facial hair, chest hair, anime, cartoon, illustration, 3d render, painting, drawing, low quality, bad anatomy, distorted face, oversaturated, dark background";

// 1. Text-to-Image Helper (Step 1 & Step 2 - with ReActor Face Swap & Dynamic Negative Prompt)
async function fetchLocalForgeSprite(
  gpuApiUrl: string,
  prompt: string,
  customNegativePrompt: string, // Passed dynamically from user input
  referenceHeroImage?: string,
  width = 512,
  height = 768
): Promise<string> {
  if (!gpuApiUrl) {
    throw new Error("Please enter a valid Local GPU Backend URL.");
  }

  const baseUrl = gpuApiUrl.trim().replace(/\/+$/, "");

  const bodyPayload: any = {
    prompt: `photorealistic raw photo, realistic character portrait, highly detailed skin texture, 8k resolution, studio lighting, clean solid white background, ${prompt}`,
    negative_prompt: customNegativePrompt,
    steps: 10,
    width: width,
    height: height,
    cfg_scale: 1.5,
    sampler_name: "Euler",
  };

  // Enable ReActor Face Swap if a reference Hero Anchor image exists
  if (referenceHeroImage && referenceHeroImage.startsWith("data:image")) {
    const cleanBase64HeroAnchor = referenceHeroImage.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    bodyPayload.alwayson_scripts = {
      reactor: {
        args: [
          cleanBase64HeroAnchor, // 0: Source face image
          true,                  // 1: Enable ReActor
          "0",                   // 2: Source face index
          "0",                   // 3: Target face index
          "inswapper_128.onnx",   // 4: Model name
          "CodeFormer",          // 5: Face restoration model
          1,                     // 6: Restoration visibility
          true,                  // 7: Restore face first
          "CUDA",                // 8: Execution provider
          0,                     // 9: Weight
          false,                 // 10: Upscale
        ],
      },
    };
  }

  const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    console.error("Forge API Error Details:", errorJson);
    throw new Error(
      `GPU Server returned status ${response.status}. Check browser F12 console for details.`
    );
  }

  const data = await response.json();
  const base64Image = data.images?.[0];

  if (!base64Image) {
    throw new Error("No image data returned from WebUI Forge.");
  }

  return `data:image/png;base64,${base64Image}`;
}

// 2. Image-to-Image Helper (Step 3 - Face Expressions with Dynamic Negative Prompt)
async function fetchLocalForgeImg2Img(
  gpuApiUrl: string,
  outfitSpriteBase64: string,
  expressionPrompt: string,
  identityPrompt: string,
  customNegativePrompt: string, // Passed dynamically from user input
  width = 512,
  height = 768
): Promise<string> {
  if (!gpuApiUrl) {
    throw new Error("Please enter a valid Local GPU Backend URL.");
  }

  const baseUrl = gpuApiUrl.trim().replace(/\/+$/, "");
  const cleanBase64Sprite = outfitSpriteBase64.replace(
    /^data:image\/\w+;base64,/,
    ""
  );

  const response = await fetch(`${baseUrl}/sdapi/v1/img2img`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      init_images: [cleanBase64Sprite],
      prompt: `facial expression ${expressionPrompt}, ${identityPrompt}, photorealistic raw photo, 8k resolution`,
      negative_prompt: customNegativePrompt,
      denoising_strength: 0.35,
      steps: 12,
      width: width,
      height: height,
      cfg_scale: 1.5,
      sampler_name: "Euler",
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    console.error("Img2Img Error Details:", errorJson);
    throw new Error("Failed to connect to GPU server for expression generation.");
  }

  const data = await response.json();
  const base64Image = data.images?.[0];

  if (!base64Image) {
    throw new Error("No expression image returned from WebUI Forge.");
  }

  return `data:image/png;base64,${base64Image}`;
}

export default function Home() {
  const [gpuUrl, setGpuUrl] = useState("http://127.0.0.1:7860");
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"create" | "outfit" | "expression">("create");

  // Gender Preset State
  const [selectedGender, setSelectedGender] = useState<"female" | "male">("female");

  // Form Inputs
  const [charName, setCharName] = useState("");
  const [identityPrompt, setIdentityPrompt] = useState(
    "24 year old woman, wavy brown hair, hazel eyes, natural freckles"
  );
  const [negativePrompt, setNegativePrompt] = useState(FEMALE_NEGATIVE_PRESET);

  const [outfitName, setOutfitName] = useState("tailored charcoal blazer, unbuttoned white dress shirt, fitted dark slacks");
  const [expressionPrompt, setExpressionPrompt] = useState("confident smirk");

  // Edit State
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdentityPrompt, setEditIdentityPrompt] = useState("");

  const [loading, setLoading] = useState(false);

  const activeCharacter = characters.find((c) => c.id === selectedCharacterId);

  // Switch negative prompt preset when changing gender selector
  const handleGenderChange = (gender: "female" | "male") => {
    setSelectedGender(gender);
    if (gender === "male") {
      setNegativePrompt(MALE_NEGATIVE_PRESET);
      setIdentityPrompt("26 year old man, handsome masculine features, short dark hair, sharp jawline");
    } else {
      setNegativePrompt(FEMALE_NEGATIVE_PRESET);
      setIdentityPrompt("24 year old woman, wavy brown hair, hazel eyes, natural freckles");
    }
  };

  // LocalStorage Persistence
  useEffect(() => {
    const savedCharacters = localStorage.getItem("vn_studio_characters");
    if (savedCharacters) {
      try {
        const parsed = JSON.parse(savedCharacters);
        setCharacters(parsed);
        if (parsed.length > 0) setSelectedCharacterId(parsed[0].id);
      } catch (e) {
        console.error("Failed to load characters", e);
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

  // Step 1: Create Character Anchor
  const handleCreateCharacter = async () => {
    if (!charName || !identityPrompt) return;
    setLoading(true);
    try {
      const fullPrompt = `front view portrait, default clothing, ${identityPrompt}`;
      const imageUrl = await fetchLocalForgeSprite(
        gpuUrl,
        fullPrompt,
        negativePrompt, // Dynamic user negative prompt
        undefined,
        512,
        768
      );

      const newChar: CharacterProfile = {
        id: Date.now().toString(),
        name: charName,
        identityPrompt,
        heroImageUrl: imageUrl,
        poses: [],
      };

      setCharacters((prev) => [...prev, newChar]);
      setSelectedCharacterId(newChar.id);
      setActiveTab("outfit");
      setCharName("");
    } catch (err: any) {
      alert(err?.message || "Failed to generate character.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate Outfit Sprite
  const handleApplyOutfit = async () => {
    if (!activeCharacter) return;
    setLoading(true);
    try {
      const fullPrompt = `full body standing pose, wearing ${
        outfitName || "casual clothes"
      }, ${activeCharacter.identityPrompt}`;

      const imageUrl = await fetchLocalForgeSprite(
        gpuUrl,
        fullPrompt,
        negativePrompt, // Dynamic user negative prompt
        activeCharacter.heroImageUrl,
        512,
        768
      );

      const newOutfit = {
        id: Date.now().toString(),
        poseName: outfitName,
        spriteUrl: imageUrl,
        expressions: [],
      };

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === activeCharacter.id ? { ...c, poses: [...c.poses, newOutfit] } : c
        )
      );
      setActiveTab("expression");
    } catch (err: any) {
      alert(err?.message || "Failed to generate outfit sprite.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Expression Variant via Img2Img
  const handleApplyExpression = async (outfitId: string) => {
    if (!activeCharacter) return;
    const targetOutfit = activeCharacter.poses.find((p) => p.id === outfitId);
    if (!targetOutfit) return;

    setLoading(true);
    try {
      const imageUrl = await fetchLocalForgeImg2Img(
        gpuUrl,
        targetOutfit.spriteUrl,
        expressionPrompt,
        activeCharacter.identityPrompt,
        negativePrompt, // Dynamic user negative prompt
        512,
        768
      );

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
                  p.id === outfitId
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

  // Edit Profile
  const handleStartEdit = (char: CharacterProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCharId(char.id);
    setEditName(char.name);
    setEditIdentityPrompt(char.identityPrompt);
  };

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

  // Delete Profile
  const handleDeleteCharacter = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this character profile?")) return;

    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (selectedCharacterId === charId) {
      const remaining = characters.filter((c) => c.id !== charId);
      setSelectedCharacterId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Visual Novel Character Studio
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
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
                        <p className="text-xs text-gray-400">{c.poses.length} Outfits</p>
                      </div>
                    </div>

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

        {/* Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
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
              onClick={() => setActiveTab("outfit")}
              disabled={!activeCharacter}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${
                activeTab === "outfit"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              2. Add Outfit
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

          {/* Edit Modal */}
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

          {/* Step 1: Character Anchor */}
          {activeTab === "create" && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">
                Step 1: Create Face & Identity Anchor
              </h2>

              {/* Gender Preset Selector */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Character Gender</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenderChange("female")}
                    className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                      selectedGender === "female"
                        ? "bg-pink-600/30 border-pink-500 text-pink-200"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    👩 Female Character
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderChange("male")}
                    className={`flex-1 py-2 rounded-lg font-semibold border transition ${
                      selectedGender === "male"
                        ? "bg-blue-600/30 border-blue-500 text-blue-200"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    👨 Male Character
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder={selectedGender === "male" ? "e.g. Alex" : "e.g. Elena"}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Identity Prompt (Face Features, Hair & Eyes)
                </label>
                <textarea
                  value={identityPrompt}
                  onChange={(e) => setIdentityPrompt(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>

              {/* Custom Negative Prompt Field */}
              <div>
                <label className="block text-sm text-red-400 font-semibold mb-1">
                  Negative Prompt (Things to Block)
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-gray-800 rounded border border-red-900/50 text-gray-300 text-xs font-mono"
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

          {/* Step 2: Outfit Studio */}
          {activeTab === "outfit" && activeCharacter && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">
                Step 2: Outfit Studio ({activeCharacter.name})
              </h2>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Outfit Description & Clothing Style
                </label>
                <input
                  type="text"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  placeholder="e.g. tailored charcoal blazer, unbuttoned white dress shirt, fitted dark slacks"
                  className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                />
              </div>

              {/* Editable Negative Prompt for Outfit Generation */}
              <div>
                <label className="block text-sm text-red-400 font-semibold mb-1">
                  Negative Prompt
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-gray-800 rounded border border-red-900/50 text-gray-300 text-xs font-mono"
                />
              </div>

              <button
                onClick={handleApplyOutfit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 py-3 rounded-lg font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Generating Outfit Sprite..." : "Generate Outfit Sprite"}
              </button>
            </div>
          )}

          {/* Step 3: Expression Studio */}
          {activeTab === "expression" && activeCharacter && (
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-6">
              <h2 className="text-lg font-bold text-blue-400">
                Step 3: Expressions for {activeCharacter.name}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Target Expression</label>
                  <input
                    type="text"
                    value={expressionPrompt}
                    onChange={(e) => setExpressionPrompt(e.target.value)}
                    placeholder="e.g. confident smirk, warm smile, angry frown"
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700 text-white"
                  />
                </div>

                {/* Editable Negative Prompt for Expression Generation */}
                <div>
                  <label className="block text-sm text-red-400 font-semibold mb-1">
                    Negative Prompt
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                    className="w-full p-2 bg-gray-800 rounded border border-red-900/50 text-gray-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {activeCharacter.poses.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="p-4 bg-gray-800/60 rounded-lg border border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-blue-300">
                        Outfit: {outfit.poseName}
                      </h3>
                      <button
                        onClick={() => handleApplyExpression(outfit.id)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5 rounded font-bold transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        + Generate Expression
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      <div className="flex-shrink-0 text-center">
                        <img
                          src={outfit.spriteUrl}
                          alt="Base Outfit"
                          className="w-28 h-36 object-cover rounded border border-gray-600"
                        />
                        <span className="text-xs text-gray-400 mt-1 block">Base Outfit</span>
                      </div>
                      {outfit.expressions.map((exp) => (
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