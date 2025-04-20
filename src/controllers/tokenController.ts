import { Request, Response } from 'express';
import { TokenAnalysisService } from '../services/tokenAnalysisService';
import { isValidSolanaAddress } from '../utils/solanaConnector';
import axios from 'axios';
import config from '../config';

// Create singleton instance
const tokenAnalysisService = new TokenAnalysisService();

export const analyzeToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenAddress } = req.params;

    if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Solana token address',
      });
      return;
    }

    const forceFresh = req.query.forceFresh === 'true';

    const analysis = await tokenAnalysisService.analyzeToken(tokenAddress, forceFresh);
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error in analyzeToken controller:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze token',
    });
  }
};

export const getTokenTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenAddress } = req.params;
    const limit = parseInt(req.query.limit as string || '10', 10);

    if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Solana token address',
      });
      return;
    }

    const transactions = await tokenAnalysisService['transactionMonitoring'].getRecentTransactions(tokenAddress, limit);

    if (tokenAddress === 'So11111111111111111111111111111111111111112') {
      try {
        const fs = require('fs');
        const path = require('path');
        const dataFilePath = path.resolve(process.cwd(), 'data.json');
        
        if (fs.existsSync(dataFilePath)) {
          const rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
          res.json({
            success: true,
            data: transactions,
            rawTransactions: rawData.slice(0, limit)
          });
          return;
        }

        const response = await axios.get(
          `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions/?api-key=${config.heliusApiKey}`
        );
        
        res.json({
          success: true,
          data: transactions,
          rawTransactions: response.data
        });
        return;
      } catch (error) {
        console.error('Error fetching raw wSOL transactions:', error);
      }
    }
    
    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error in getTokenTransactions controller:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get token transactions',
    });
  }
};

// Export service instance for other modules to use
export { tokenAnalysisService };