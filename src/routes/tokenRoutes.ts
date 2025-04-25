import { Router, Request, Response } from 'express';
import { analyzeToken, getTokenTransactions } from '../controllers/tokenController';
import { getLLMAnalysis } from '../controllers/llmController';
import axios from 'axios';
import config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { TokenAnalysisService } from '../services/tokenAnalysisService';
import { fetchSolanaTokenList, isVerifiedToken } from '../utils/tokenListProvider';
import { getTokenCreationInfo } from '../utils/solanaConnector';

const router = Router();
const transactionMonitoring = new TokenAnalysisService()['transactionMonitoring'];
router.get('/analyze/:tokenAddress', analyzeToken);
router.get('/transactions/:tokenAddress', getTokenTransactions);
router.get('/llm-analysis/:tokenAddress', getLLMAnalysis);

router.get('/is-verified/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const isVerified = await isVerifiedToken(tokenAddress);
    
    res.json({
      success: true,
      isVerified,
    });
  } catch (error) {
    console.error('Error checking token verification status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/verified-tokens-info', async (req, res) => {
  try {
    const tokenList = await fetchSolanaTokenList();
    const tokenCount = Object.keys(tokenList).length;
    
    const exampleTokens = Object.keys(tokenList).slice(0, 5).map(addr => {
      const token = tokenList[addr];
      return {
        address: token.address,
        name: token.name,
        symbol: token.symbol
      };
    });
    
    res.json({
      success: true,
      tokenCount,
      exampleTokens,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting verified token list info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/data-json-test', async (req, res) => {
  try {
    const transactions = await transactionMonitoring.getRecentTransactions('test', 10);
    
    res.json({
      success: true,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 5)
    });
  } catch (error) {
    // console.error('Error testing data.json:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/wsol-raw-transactions', async (req, res) => {
  try {
    const dataFilePath = path.resolve(process.cwd(), 'data.json');
    
    if (fs.existsSync(dataFilePath)) {
      // console.log('Using local data.json file for wSOL transactions');
      const rawData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      const limit = parseInt(req.query.limit as string || '10', 10);
      
      res.json({
        success: true,
        source: 'local_file',
        data: rawData.slice(0, limit)
      });
      return;
    }
    
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/So11111111111111111111111111111111111111112/transactions/?api-key=${config.heliusApiKey}`
    );
    
    res.json({
      success: true,
      source: 'api',
      data: response.data
    });
  } catch (error) {
    // console.error('Error fetching raw wSOL transactions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get wSOL raw transactions'
    });
  }
});

// Token creation info handler
async function getTokenCreationInfoHandler(req: Request, res: Response): Promise<void> {
  try {
    const { tokenAddress } = req.params;
    
    const creationInfo = await getTokenCreationInfo( tokenAddress);
    
    if (!creationInfo) {
      res.status(404).json({
        success: false,
        message: 'Token creation information not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: creationInfo
    });
  } catch (error) {
    // console.error('Error fetching token creation info:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

router.get('/token-creation-info/:tokenAddress', getTokenCreationInfoHandler);

export default router;