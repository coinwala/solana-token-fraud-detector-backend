import axios from 'axios';

export interface TokenListItem {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  extensions?: {
    website?: string;
    bridgeContract?: string;
    assetContract?: string;
    description?: string;
    [key: string]: any;
  };
}

let tokenListCache: { [address: string]: TokenListItem } = {};
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export const fetchSolanaTokenList = async (): Promise<{ [address: string]: TokenListItem }> => {
  try {
    if (Object.keys(tokenListCache).length > 0 && (Date.now() - lastFetchTime) < CACHE_DURATION) {
      return tokenListCache;
    }

    const response = await axios.get('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
    
    if (!response.data || !response.data.tokens) {
      throw new Error('Invalid token list format');
    }

    tokenListCache = {};

    for (const token of response.data.tokens) {
      if (token.chainId === 101) {
        tokenListCache[token.address] = token;
      }
    }

    lastFetchTime = Date.now();
    console.log(`Loaded ${Object.keys(tokenListCache).length} verified tokens from Solana token list`);
    
    return tokenListCache;
  } catch (error) {
    console.error('Error fetching Solana token list:', error);
    return tokenListCache;
  }
};
export const isVerifiedToken = async (tokenAddress: string): Promise<boolean> => {
  const tokenList = await fetchSolanaTokenList();
  return !!tokenList[tokenAddress];
};

export const getVerifiedTokenInfo = async (tokenAddress: string): Promise<TokenListItem | null> => {
  const tokenList = await fetchSolanaTokenList();
  return tokenList[tokenAddress] || null;
};