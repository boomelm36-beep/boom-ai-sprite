export interface ExpressionVariant {
  id: string;
  name: string;
  imageUrl: string;
}

export interface PoseSprite {
  id: string;
  poseName: string;
  spriteUrl: string;
  expressions: ExpressionVariant[];
}

export interface CharacterProfile {
  id: string;
  name: string;
  identityPrompt: string;
  heroImageUrl: string; // The primary identity anchor
  poses: PoseSprite[];
}

export interface ApiResponse {
  imageUrl?: string;
  error?: string;
}