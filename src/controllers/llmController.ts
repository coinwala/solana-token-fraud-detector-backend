import { Request, Response } from 'express';
import { LLMService } from '../services/llmService';
import { TokenService } from '../services/tokenService';
import { isValidSolanaAddress } from '../utils/solanaConnector';

const llmService = new LLMService();
const tokenService = new TokenService();

export const getLLMAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenAddress } = req.params;
    if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Solana token address',
      });
      return;
    }
    
    const tokenInfo = await tokenService.getTokenInfo(tokenAddress);
    
    if (!tokenInfo) {
      res.status(404).json({
        success: false,
        error: `Token information not found for address: ${tokenAddress}`,
      });
      return;
    }

    const llmAnalysis = await llmService.analyzeToken(tokenInfo);
    
    res.json({
      success: true,
      data: {
        tokenAddress,
        llmAnalysis,
      },
    });
  } catch (error: any) {
    console.error('Error getting LLM analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get LLM analysis',
    });
  }
};