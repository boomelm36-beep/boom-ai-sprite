export interface ApiResponse {
  imageUrl?: string;
  error?: string;
}

export interface PoseRequestBody {
  prompt: string;
  poseImage: string;
  seed?: number;
}

export interface ExpressionRequestBody {
  baseImageUrl: string;
  faceMaskImage: string;
  expressionPrompt: string;
  characterPrompt: string;
}