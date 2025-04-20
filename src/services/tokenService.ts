import { getTokenMetadata, getTokenMintInfo, getTokenCreationInfo, isValidSolanaAddress } from '../utils/solanaConnector';
import { TokenInfo } from '../models/token';
import { WHITELISTED_TOKENS } from './riskEngineService';
import { getVerifiedTokenInfo } from '../utils/tokenListProvider';

export class TokenService {
  public async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      if (!isValidSolanaAddress(tokenAddress)) {
        throw new Error('Invalid Solana token address');
      }

      const verifiedToken = await getVerifiedTokenInfo(tokenAddress);
      
      const metadata = await getTokenMetadata(tokenAddress);
      if (!metadata && !verifiedToken) {
        throw new Error('Token metadata not found');
      }

      let mintInfo = null;
      try {
        mintInfo = await getTokenMintInfo(tokenAddress);
      } catch (error) {
        console.warn(`Could not get standard mint info for ${tokenAddress}, using metadata only`);
      }
      
      const creationInfo = await getTokenCreationInfo(tokenAddress);

      let tokenAgeDays: number | null = null;
      if (creationInfo?.createdAt) {
        const creationDate = new Date(creationInfo.createdAt);
        tokenAgeDays = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      let formattedSupply = 'Unknown';
      let decimals = verifiedToken?.decimals || 0;
      
      if (mintInfo) {
        decimals = mintInfo.decimals;
        formattedSupply = (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toString();
      } else if (metadata?.supply !== undefined && metadata?.decimals !== undefined) {
        decimals = metadata.decimals;
        formattedSupply = (Number(metadata.supply) / Math.pow(10, metadata.decimals)).toString();
      }

      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        name: verifiedToken?.name || (metadata?.name || 'Unknown'),
        symbol: verifiedToken?.symbol || (metadata?.symbol || 'Unknown'),
        decimals,
        supply: formattedSupply,
        createdAt: creationInfo?.createdAt || metadata?.onChainCreatedAt || null,
        creatorAddress: creationInfo?.creatorAddress || metadata?.creatorAddress || null,
        mintAuthority: mintInfo?.mintAuthority?.toBase58() || null,
        freezeAuthority: mintInfo?.freezeAuthority?.toBase58() || null,
        tokenAgeDays,
        metadata: {
          description: verifiedToken?.extensions?.description || (metadata?.description || ''),
          image: verifiedToken?.logoURI || (metadata?.image || ''),
          externalUrl: verifiedToken?.extensions?.website || (metadata?.externalUrl || ''),
        }
      };

      if (verifiedToken) {
        if (!tokenInfo.tokenAgeDays) {
          tokenInfo.tokenAgeDays = 365;
          
          if (!tokenInfo.createdAt) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            tokenInfo.createdAt = oneYearAgo.toISOString();
          }
        }
      } 
      else if (WHITELISTED_TOKENS[tokenAddress]) {
        const whitelistedToken = WHITELISTED_TOKENS[tokenAddress];
        
        tokenInfo.name = whitelistedToken.name;
        tokenInfo.symbol = whitelistedToken.symbol;
        
        if (!tokenInfo.createdAt || !tokenInfo.tokenAgeDays) {
          tokenInfo.tokenAgeDays = tokenInfo.tokenAgeDays || 365; 
          
          if (!tokenInfo.createdAt) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            tokenInfo.createdAt = oneYearAgo.toISOString();
          }
        }
        
        if (tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
          tokenInfo.metadata.description = tokenInfo.metadata.description || 
            "USDC is a fully collateralized US dollar stablecoin developed by CENTRE.";
        }
        
        if (tokenAddress === 'So11111111111111111111111111111111111111112') {
          tokenInfo.metadata.description = tokenInfo.metadata.description || 
            "Wrapped SOL (wSOL) is the wrapped version of SOL, the native token of the Solana blockchain.";
        }
      }

      return tokenInfo;
    } catch (error) {
      console.error('Error in getTokenInfo:', error);
      throw error;
    }
  }
}