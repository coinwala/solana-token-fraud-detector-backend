import { TokenService } from './tokenService';
import { RiskEngineService } from './riskEngineService';
import { WalletAnalysisService } from './walletAnalysisService';
import { TransactionMonitoringService } from './transactionMonitoringService';
import { LLMService } from './llmService';
import { TokenInfo, TokenAnalysis, TokenTransaction } from '../models/token';
import { EventEmitter } from 'events';

export class TokenAnalysisService extends EventEmitter {
  private tokenService: TokenService;
  private riskEngine: RiskEngineService;
  private walletAnalysis: WalletAnalysisService;
  private transactionMonitoring: TransactionMonitoringService;
  private llmService: LLMService;

  private analysisCache: Map<string, { 
    timestamp: number, 
    analysis: TokenAnalysis 
  }> = new Map();

  private CACHE_EXPIRY_MS = 30 * 60 * 1000;
  
  constructor() {
    super();
    this.tokenService = new TokenService();
    this.riskEngine = new RiskEngineService();
    this.walletAnalysis = new WalletAnalysisService();
    this.transactionMonitoring = new TransactionMonitoringService();
    this.llmService = new LLMService();

    this.transactionMonitoring.on('transaction', this.handleNewTransaction.bind(this));
  }

  public async analyzeToken(tokenAddress: string, forceFresh: boolean = false): Promise<TokenAnalysis> {
    try {

      if (!forceFresh) {
        const cached = this.analysisCache.get(tokenAddress);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_EXPIRY_MS) {
          return cached.analysis;
        }
      }

      await this.transactionMonitoring.startMonitoring(tokenAddress);

      let tokenInfo: TokenInfo;
      try {
        const result = await this.tokenService.getTokenInfo(tokenAddress);
        tokenInfo = result!;
      } catch (error) {
        console.error(`Error getting token info for ${tokenAddress}:`, error);

        tokenInfo = {
          address: tokenAddress,
          name: 'Unknown',
          symbol: 'Unknown',
          decimals: 0,
          supply: 'Unknown',
          createdAt: null,
          creatorAddress: null,
          mintAuthority: null,
          freezeAuthority: null,
          tokenAgeDays: null,
          metadata: {
            description: '',
            image: '',
            externalUrl: '',
          }
        };
      }

      let creatorAnalysis = null;
      if (tokenInfo.creatorAddress) {
        try {
          creatorAnalysis = await this.walletAnalysis.analyzeCreatorWallet(tokenInfo.creatorAddress);

          if (creatorAnalysis.numTokensCreated > 5) {
            tokenInfo.creatorTokenCount = creatorAnalysis.numTokensCreated;
          }
          
          if (creatorAnalysis.hasRugPullHistory) {
            tokenInfo.creatorHasRugPullHistory = true;
          }
        } catch (error) {
          console.error(`Error analyzing creator wallet for ${tokenAddress}:`, error);
        }
      }

      let recentTransactions: TokenTransaction[] = [];
      try {
        recentTransactions = await this.transactionMonitoring.getRecentTransactions(tokenAddress);
      } catch (error) {
        console.error(`Error getting transactions for ${tokenAddress}:`, error);
      }

      let riskAnalysis;
      try {
        riskAnalysis = await this.riskEngine.analyzeTokenRisk(tokenInfo, {
          creatorAnalysis,
          recentTransactions,
        });
      } catch (error) {
        console.error(`Error generating risk analysis for ${tokenAddress}:`, error);
        riskAnalysis = {
          riskScore: 0,
          riskLevel: 'Unknown',
          riskFactors: ['Could not analyze risk factors'],
        };
      }

      let llmAnalysis;
      try {
        llmAnalysis = await this.llmService.analyzeToken(tokenInfo, {
          creatorAnalysis,
          recentTransactions,
        });
      } catch (error) {
        console.error(`Error getting LLM analysis for ${tokenAddress}:`, error);

        llmAnalysis = {
          riskAssessment: 'Unknown',
          confidenceScore: 0,
          redFlags: ['LLM analysis failed'],
          explanation: 'Could not generate LLM analysis due to technical issues.'
        };
      }

      const analysis: TokenAnalysis = {
        tokenInfo,
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel,
        riskFactors: riskAnalysis.riskFactors,
        analysisDate: new Date().toISOString(),
        llmAnalysis,
      };

      this.analysisCache.set(tokenAddress, {
        timestamp: Date.now(),
        analysis,
      });

      this.emit('analysis', {
        tokenAddress,
        analysis,
      });
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing token ${tokenAddress}:`, error);
      throw error;
    }
  }

  private async handleNewTransaction(data: { tokenAddress: string, transaction: TokenTransaction }): Promise<void> {
    try {
      const { tokenAddress, transaction } = data;

      this.emit('transaction', {
        tokenAddress,
        transaction,
      });

      const cached = this.analysisCache.get(tokenAddress);
      if (cached) {

        const isSignificantTransaction = this.isSignificantTransaction(transaction);
        
        if (isSignificantTransaction) {

          const { tokenInfo } = cached.analysis;

          const llmAnalysis = await this.llmService.analyzeToken(tokenInfo, {
            recentTransaction: transaction,
          });

          cached.analysis.llmAnalysis = llmAnalysis;

          this.analysisCache.set(tokenAddress, {
timestamp: Date.now(),
            analysis: cached.analysis,
          });

          this.emit('analysis', {
            tokenAddress,
            analysis: cached.analysis,
            updateType: 'transaction',
          });
        } else {

          cached.timestamp = Date.now() - this.CACHE_EXPIRY_MS - 1;
          this.analysisCache.set(tokenAddress, cached);
        }
      }
    } catch (error) {
      console.error(`Error handling new transaction for ${data.tokenAddress}:`, error);
    }
  }

  private isSignificantTransaction(transaction: TokenTransaction): boolean {

    if (transaction.amount && parseFloat(transaction.amount) > 1000) {
      return true;
    }

    if (transaction.type === 'rugpull' || transaction.type === 'largeWithdrawal') {
      return true;
    }
    
    return false;
  }

  public async stopMonitoring(tokenAddress: string): Promise<boolean> {
    return this.transactionMonitoring.stopMonitoring(tokenAddress);
  }
}