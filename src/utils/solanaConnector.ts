import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, Mint } from '@solana/spl-token';
import axios from 'axios';
import config from '../config';

const KNOWN_TOKENS: Record<string, any> = {
  'So11111111111111111111111111111111111111112': {
    name: 'Wrapped SOL',
    symbol: 'wSOL',
    decimals: 9,
    description: 'Wrapped SOL is a token that represents SOL in the Solana Token ecosystem.',
    supply: '0',
    image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    externalUrl: 'https://solana.com'
  },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    description: 'USDC is a fully collateralized US dollar stablecoin developed by CENTRE.',
    image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    externalUrl: 'https://www.centre.io/usdc'
  },
};

export const connection = new Connection(config.solanaRpcUrl);

export async function testHeliusConnection(): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg/transactions?api-key=${config.heliusApiKey}`
    );
    
    if (response.data && response.status === 200) {
      console.log('Helius connection successful:', response.data);
      return true;
    } else {
      console.error('Invalid Helius API response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error testing Helius connection:', error);
    return false;
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getTokenMetadata(tokenAddress: string): Promise<any> {
  try {
    if (KNOWN_TOKENS[tokenAddress]) {
      console.log(`Using hardcoded metadata for known token: ${tokenAddress}`);
      return {
        ...KNOWN_TOKENS[tokenAddress],
        address: tokenAddress,
      };
    }

    const response = await axios.get(
      `https://api.helius.xyz/v0/tokens?api-key=${config.heliusApiKey}&include=all&addresses=${tokenAddress}`
    );
    
    if (response.data && response.data.tokens && response.data.tokens.length > 0) {
      return response.data.tokens[0];
    }

    if (KNOWN_TOKENS[tokenAddress]) {
      return {
        ...KNOWN_TOKENS[tokenAddress],
        address: tokenAddress,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching token metadata:', error);

    if (KNOWN_TOKENS[tokenAddress]) {
      return {
        ...KNOWN_TOKENS[tokenAddress],
        address: tokenAddress,
      };
    }
    
    throw new Error('Failed to fetch token metadata');
  }
}

export async function getTokenMintInfo(tokenAddress: string): Promise<Mint | null> {
  try {
    const mintPublicKey = new PublicKey(tokenAddress);
    return await getMint(connection, mintPublicKey);
  } catch (error) {
    console.error('Error fetching token mint info:', error);

    if (error instanceof Error && error.name === 'TokenInvalidAccountOwnerError') {
      try {
        const accountInfo = await connection.getAccountInfo(new PublicKey(tokenAddress));
        if (accountInfo) {
          return {
            address: new PublicKey(tokenAddress),
            mintAuthority: null,
            supply: BigInt(0),
            decimals: 0,
            isInitialized: true,
            freezeAuthority: null,
            tlvData: Buffer.from([]),
          };
        }
      } catch (secondError) {
        console.error('Error getting fallback account info:', secondError);
      }
    }
    
    throw new Error('Failed to fetch token mint info');
  }
}

export async function getTokenCreationInfo(tokenAddress: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${config.heliusApiKey}`
    );

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const creationTx = response.data[0];
      return {
        createdAt: new Date(creationTx.timestamp * 1000).toISOString(),
        creatorAddress: creationTx.feePayer,
        signature: creationTx.signature,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching token creation info:', error);
    return null;
  }
}