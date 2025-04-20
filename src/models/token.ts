export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  createdAt: string | null;
  creatorAddress: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  tokenAgeDays: number | null;
  metadata: {
    description: string;
    image: string;
    externalUrl: string;
  };
  creatorTokenCount?: number;
  creatorHasRugPullHistory?: boolean;
}

export interface LLMAnalysis {
  riskAssessment: string;
  confidenceScore: number;
  redFlags: string[];
  explanation: string;
}

export interface TokenAnalysis {
  tokenInfo: TokenInfo;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  analysisDate: string;
  llmAnalysis?: LLMAnalysis;
}

export interface TokenTransaction {
  signature: string;
  timestamp: number;
  type: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  description?: string;
  source?: string;
}