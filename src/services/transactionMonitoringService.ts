import { Connection, PublicKey, LogsFilter, Logs, LogsCallback } from '@solana/web3.js';
import { connection } from '../utils/solanaConnector';
import { EventEmitter } from 'events';
import axios from 'axios';
import config from '../config';
import * as fs from 'fs';
import * as path from 'path';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 'your-api-key-here';

interface TokenTransaction {
  signature: string;
  timestamp: number;
  type: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  description?: string;
  source?: string;
}

export class TransactionMonitoringService extends EventEmitter {
  private activeSubscriptions: Map<string, number> = new Map();

  public async startMonitoring(tokenAddress: string): Promise<boolean> {
    try {
      if (this.activeSubscriptions.has(tokenAddress)) {
        return true;
      }

      const subscriptionId = connection.onAccountChange(
        new PublicKey(tokenAddress),
        (accountInfo, context) => {

          this.fetchRecentTokenTransactions(tokenAddress);
        },
        'confirmed'
      );
     
      this.activeSubscriptions.set(tokenAddress, subscriptionId);
      
      // console.log(`Started monitoring transactions for token: ${tokenAddress}`);
      return true;
    } catch (error) {
      // console.error(`Error starting transaction monitoring for ${tokenAddress}:`, error);
      return false;
    }
  }

  public async stopMonitoring(tokenAddress: string): Promise<boolean> {
    try {
      const subscriptionId = this.activeSubscriptions.get(tokenAddress);
      
      if (subscriptionId !== undefined) {
        connection.removeAccountChangeListener(subscriptionId);
        this.activeSubscriptions.delete(tokenAddress);
        // console.log(`Stopped monitoring transactions for token: ${tokenAddress}`);
      }
      
      return true;
    } catch (error) {
      // console.error(`Error stopping transaction monitoring for ${tokenAddress}:`, error);
      return false;
    }
  }

  private async fetchRecentTokenTransactions(tokenAddress: string): Promise<void> {
    try {
      const recentTransactions = await this.getRecentTransactions(tokenAddress, 5);

      for (const transaction of recentTransactions) {
        this.emit('transaction', {
          tokenAddress,
          transaction,
        });
      }
    } catch (error) {
      // console.error(`Error fetching transactions for ${tokenAddress}:`, error);
    }
  }

  private async processTransactionLogs(tokenAddress: string, logs: Logs): Promise<void> {
    try {
      const { signature, err, logs: logMessages } = logs;
      
      if (err) {
return;
      }

      const txInfo = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo || !txInfo.meta) {
        return;
      }

      const preTokenBalances = txInfo.meta.preTokenBalances || [];
      const postTokenBalances = txInfo.meta.postTokenBalances || [];

      const transaction: TokenTransaction = {
        signature,
        timestamp: txInfo.blockTime || Math.floor(Date.now() / 1000),
type: 'transfer',
amount: '0',
      };

      this.emit('transaction', {
        tokenAddress,
        transaction,
      });
    } catch (error) {
      // console.error(`Error processing transaction for ${tokenAddress}:`, error);
    }
  }

  public async getRecentTransactions(tokenAddress: string, limit: number = 10): Promise<TokenTransaction[]> {
    try {
      try {
        const dataFilePath = path.resolve(process.cwd(), 'data.json');
        // console.log('Attempting to read from:', dataFilePath);
        
        if (fs.existsSync(dataFilePath)) {
          // console.log('Using local data.json file for transactions');
          const localData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

          const transactions: TokenTransaction[] = localData.map((tx: any) => ({
            signature: tx.signature || 'unknown',
            timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
            type: tx.type || this.determineTransactionType(tx),
            amount: this.calculateTransactionAmountV0(tx),
            fromAddress: tx.tokenTransfers?.[0]?.fromUserAccount || tx.feePayer,
            toAddress: tx.tokenTransfers?.[0]?.toUserAccount,
            description: tx.description || '',
            source: tx.source || '',
          }));
          
          // console.log(`Found ${transactions.length} transactions in local data file`);
          return transactions.slice(0, limit);
        } else {
          // console.log('data.json file not found at:', dataFilePath);
        }
      } catch (fileError) {
        // console.error('Error reading from data.json, falling back to API:', fileError);
      }

      // console.log(`Fetching transactions for token ${tokenAddress} from Helius API`);

      if (tokenAddress === 'So11111111111111111111111111111111111111112') {
        const response = await axios.get(
          `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
        );

        if (!response.data || !Array.isArray(response.data)) {
          // console.warn(`Invalid response from Helius API for ${tokenAddress}:`, response.data);
          return [];
        }

        const transactions: TokenTransaction[] = response.data.map((tx: any) => ({
          signature: tx.signature || 'unknown',
          timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
          type: tx.type || this.determineTransactionType(tx),
          amount: this.calculateTransactionAmountV0(tx),
          fromAddress: tx.tokenTransfers?.[0]?.fromUserAccount,
          toAddress: tx.tokenTransfers?.[0]?.toUserAccount,
          description: tx.description || '',
          source: tx.source || '',
        }));
        
        return transactions.slice(0, limit);
      }

      const response = await axios.get(
        `https://api.helius.xyz/v0/tokens/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
      );

      if (!response.data || !Array.isArray(response.data)) {
        // console.warn(`Invalid response from Helius API for ${tokenAddress}:`, response.data);
        return [];
      }

      const transactions: TokenTransaction[] = response.data.map((tx: any) => ({
        signature: tx.signature || 'unknown',
        timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
        type: this.determineTransactionType(tx),
        amount: this.calculateTransactionAmount(tx),
        fromAddress: tx.tokenTransfers?.[0]?.fromUserAccount,
        toAddress: tx.tokenTransfers?.[0]?.toUserAccount,
      }));
      
      return transactions;
    } catch (error) {
      // console.error(`Error getting recent transactions for ${tokenAddress}:`, error);
      return [];
    }
  }

  private determineTransactionType(tx: any): string {
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      return 'transfer';
    }
    return 'unknown';
  }

  private calculateTransactionAmount(tx: any): string {
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
      return tx.tokenTransfers[0].tokenAmount || '0';
    }
    return '0';
  }

  private calculateTransactionAmountV0(tx: any): string {
    if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {

      return tx.tokenTransfers[0].tokenAmount || '0';
    }

    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {

      const lamports = tx.nativeTransfers[0].amount || 0;
      return (lamports / 1_000_000_000).toString();
    }
    
    return '0';
  }
}