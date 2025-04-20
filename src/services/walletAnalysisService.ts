import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import config from '../config';
import { connection } from '../utils/solanaConnector';

export interface CreatorAnalysis {
  numTokensCreated: number;
  hasRugPullHistory: boolean;
  associatedWallets: string[];
  suspiciousPatterns: string[];
}

export class WalletAnalysisService {

  public async analyzeCreatorWallet(creatorAddress: string): Promise<CreatorAnalysis> {
    try {
      
      const createdTokens = await this.getTokensCreatedByWallet(creatorAddress);
      const rugPullAnalysis = await this.checkRugPullHistory(creatorAddress, createdTokens);
      const associatedWallets = await this.getAssociatedWallets(creatorAddress);

      return {
        numTokensCreated: createdTokens.length,
        hasRugPullHistory: rugPullAnalysis.hasRugPullHistory,
        associatedWallets,
        suspiciousPatterns: rugPullAnalysis.suspiciousPatterns,
      };

    } catch (error) {
      console.error('Error analyzing creator wallet:', error);
      return {
        numTokensCreated: 0,
        hasRugPullHistory: false,
        associatedWallets: [],
        suspiciousPatterns: [],
      };
    }
  }

  private async getTokensCreatedByWallet(walletAddress: string): Promise<string[]> {
    try {
      const response = await axios.post(
        `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${config.heliusApiKey}`,
        {
          limit: 100, 
        }
      );

      const tokenCreationTxs = response.data.filter((tx: any) => {
        return tx.tokenTransfers && tx.tokenTransfers.length > 0;
      });

      const tokenAddresses = new Set<string>();
      tokenCreationTxs.forEach((tx: any) => {
        tx.tokenTransfers.forEach((transfer: any) => {
          if (transfer.tokenAddress) {
            tokenAddresses.add(transfer.tokenAddress);
          }
        });
      });

      return Array.from(tokenAddresses);
    } catch (error) {
      console.error('Error getting tokens created by wallet:', error);
      return [];
    }
  }

  private async checkRugPullHistory(walletAddress: string, createdTokens: string[]): Promise<{
    hasRugPullHistory: boolean;
    suspiciousPatterns: string[];
  }> {
    try {
      const suspiciousPatterns: string[] = [];
      if (createdTokens.length > 5) {
        suspiciousPatterns.push(`Creator has made ${createdTokens.length} different tokens`);
      }
      
      return {
        hasRugPullHistory: suspiciousPatterns.length > 0,
        suspiciousPatterns,
      };
    } catch (error) {
      console.error('Error checking rug pull history:', error);
      return {
        hasRugPullHistory: false,
        suspiciousPatterns: [],
      };
    }
  }

  private async getAssociatedWallets(walletAddress: string): Promise<string[]> {
    try {
      return [];
    } catch (error) {
      console.error('Error getting associated wallets:', error);
      return [];
    }
  }
}