import axios from 'axios';
import config from '../config';
import { TokenInfo } from '../models/token';
import { WHITELISTED_TOKENS } from './riskEngineService';
import { isVerifiedToken } from '../utils/tokenListProvider';

export interface LLMResponse {
  riskAssessment: string;
  confidenceScore: number;
  redFlags: string[];
  explanation: string;
}

export class LLMService {
  private API_URL = config.llm.apiUrl;
  private MODEL = config.llm.model;
  
  private cache: Map<string, { 
    timestamp: number, 
    response: LLMResponse 
  }> = new Map();
  
  private verifiedTokensCache = new Map<string, boolean>();
  
  private CACHE_EXPIRY_MS = config.llm.cacheExpiryMs;

  public async analyzeToken(tokenInfo: TokenInfo, additionalContext: any = {}): Promise<LLMResponse> {
    try {
      if (!tokenInfo) {
        throw new Error("Token information is required for LLM analysis");
      }

      if (WHITELISTED_TOKENS[tokenInfo.address]) {
        return this.getWhitelistedTokenResponse(tokenInfo.address);
      }
      
      let isVerified = this.verifiedTokensCache.get(tokenInfo.address);
      
      if (isVerified === undefined) {
        isVerified = await isVerifiedToken(tokenInfo.address);
        this.verifiedTokensCache.set(tokenInfo.address, isVerified);
      }
      
      if (isVerified) {
        return this.getVerifiedTokenResponse(tokenInfo);
      }

      const cacheKey = this.generateCacheKey(tokenInfo, additionalContext);
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
        return cached.response;
      }
      const prompt = this.createPrompt(tokenInfo, additionalContext);
      const response = await this.callLLM(prompt);
      const llmResponse = this.parseResponse(response);
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        response: llmResponse,
      });
      
      return llmResponse;
    } catch (error) {
      console.error('Error analyzing token with LLM:', error);
      return this.getFallbackAnalysis(tokenInfo);
    }
  }

  private getWhitelistedTokenResponse(tokenAddress: string): LLMResponse {
    const token = WHITELISTED_TOKENS[tokenAddress];
    return {
      riskAssessment: 'Safe',
      confidenceScore: 100,
      redFlags: [],
      explanation: `${token.name} (${token.symbol}) is a verified token on Solana with established history and reputation. It is considered safe for transactions.`
    };
  }
  
  private getVerifiedTokenResponse(tokenInfo: TokenInfo): LLMResponse {
    return {
      riskAssessment: 'Safe',
      confidenceScore: 100,
      redFlags: [],
      explanation: `${tokenInfo.name} (${tokenInfo.symbol}) is a verified token listed in the official Solana token list. It has been validated by the community and is considered safe for transactions.`
    };
  }

  private generateCacheKey(tokenInfo: TokenInfo, additionalContext: any = {}): string {
    const key = {
      address: tokenInfo.address,
      mintAuthority: tokenInfo.mintAuthority,
      freezeAuthority: tokenInfo.freezeAuthority,
      tokenAgeDays: tokenInfo.tokenAgeDays,
      creatorTokenCount: tokenInfo.creatorTokenCount,
      creatorHasRugPullHistory: tokenInfo.creatorHasRugPullHistory,
      newTx: additionalContext.recentTransaction 
        ? additionalContext.recentTransaction.signature 
        : undefined,
    };
    
    return JSON.stringify(key);
  }


  private createPrompt(tokenInfo: TokenInfo, additionalContext: any): string {
    const tokenAgeText = tokenInfo.tokenAgeDays !== null 
      ? `${tokenInfo.tokenAgeDays} days old` 
      : 'unknown age';

    const creatorInfo = additionalContext.creatorAnalysis 
      ? `- Creator has created ${additionalContext.creatorAnalysis.numTokensCreated} tokens
- Creator has rug pull history: ${additionalContext.creatorAnalysis.hasRugPullHistory ? 'Yes' : 'No'}`
      : '- No creator analysis available';
    return `You are an expert in Solana token security analysis. Your task is to analyze tokens for potential fraud.

Examples of fraudulent tokens:
1. Token FAKETOKEN (address: abc123...)
   - Red flags: Mint authority not revoked, 95% supply in one wallet, created 2 days ago
   - Analysis: High risk of rug pull due to concentrated supply and active mint authority

Examples of legitimate tokens:
1. Token SOL (address: xyz789...)
   - Properties: Mint authority revoked, distributed supply, active for 8 months
   - Analysis: Low risk, shows characteristics of established project

Now analyze this token:
- Name: ${tokenInfo.name}
- Symbol: ${tokenInfo.symbol}
- Address: ${tokenInfo.address}
- Created: ${tokenInfo.createdAt} (${tokenAgeText})
- Mint Authority: ${tokenInfo.mintAuthority ? 'Active (not revoked)' : 'Revoked'}
- Freeze Authority: ${tokenInfo.freezeAuthority ? 'Active' : 'None'}
- Supply: ${tokenInfo.supply}
- Description: ${tokenInfo.metadata.description || 'None provided'}
${creatorInfo}

Provide a risk assessment with:
1. Risk assessment: Give a brief assessment of the token's risk level
2. Confidence score: A number between 0-100 indicating your confidence in this assessment
3. Red flags: A list of specific red flags you identified (if any)
4. Explanation: A brief explanation of your reasoning (2-3 sentences)

Format your response as JSON exactly like this:
{
  "riskAssessment": "High Risk",
  "confidenceScore": 85,
  "redFlags": ["Mint authority not revoked", "Token created recently"],
  "explanation": "This token shows multiple characteristics of potential fraud."
}`;
  }

private async callLLM(prompt: string, retries = 2): Promise<string> {
    try {
      console.log(`Calling LLM API with model: ${this.MODEL}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openrouterApiKey}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Solana Token Fraud Detector'
      };
      
      const response = await axios.post(
        this.API_URL,
        {
          model: this.MODEL,
          messages: [
            { role: 'system', content: 'You are a crypto security expert analyzing Solana tokens.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: config.llm.maxTokens,
          temperature: config.llm.temperature
        },
        {
          headers,
          timeout: 15000
        }
      );
  
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }
      
      throw new Error('Unexpected response format from LLM API');
    } catch (error) {
      console.error('Error calling LLM API:', error);
      
      if (retries > 0) {
        console.log(`Retrying LLM API call, ${retries} attempts remaining...`);
        const delay = (3 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callLLM(prompt, retries - 1);
      }
      
      throw error;
    }
  }

  private parseResponse(responseText: string): LLMResponse {
    try {
      const parsed = JSON.parse(responseText);
      
      return {
        riskAssessment: parsed.riskAssessment || 'Unknown',
        confidenceScore: parsed.confidenceScore || 50,
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        explanation: parsed.explanation || 'No explanation provided'
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response');
    }
  }

  private getFallbackAnalysis(tokenInfo: TokenInfo): LLMResponse {
    const redFlags = [];
    let riskLevel = 'Low Risk';
    
    if (tokenInfo.mintAuthority) {
      redFlags.push('Mint authority not revoked');
      riskLevel = 'Medium Risk';
    }
    
    if (tokenInfo.tokenAgeDays !== null && tokenInfo.tokenAgeDays < 7) {
      redFlags.push('Token created very recently');
      riskLevel = 'Medium Risk';
    }
    
    if (redFlags.length >= 2) {
      riskLevel = 'High Risk';
    }
    
    return {
      riskAssessment: riskLevel,
      confidenceScore: 60,
      redFlags,
      explanation: 'This is a fallback analysis based on basic token properties. LLM analysis was not available.'
    };
  }
}