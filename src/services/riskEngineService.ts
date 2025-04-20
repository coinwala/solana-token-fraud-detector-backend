import { TokenInfo } from '../models/token';
import { isVerifiedToken } from '../utils/tokenListProvider';

export const RISK_THRESHOLDS = {
  SAFE: 30,
  CAUTION: 60,
  HIGH_RISK: 80,
};

export const RISK_FACTORS = {
  MINT_AUTHORITY_ACTIVE: 30,
  FREEZE_AUTHORITY_ACTIVE: 20,
  RECENT_CREATION: 15,
  LOW_SUPPLY: 10,
  HIGH_SUPPLY_CONCENTRATION: 25,
  CREATOR_MULTIPLE_TOKENS: 15,
  CREATOR_DUMP_HISTORY: 30,
  SUSPICIOUS_TRANSACTIONS: 25,
};

interface WhitelistedToken {
  name: string;
  symbol: string;
  knownSafe: boolean;
}

export const WHITELISTED_TOKENS: { [address: string]: WhitelistedToken } = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    name: 'USD Coin',
    symbol: 'USDC',
    knownSafe: true
  },
  'So11111111111111111111111111111111111111112': {
    name: 'Wrapped SOL',
    symbol: 'wSOL',
    knownSafe: true
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    name: 'USDT',
    symbol: 'USDT',
    knownSafe: true
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    name: 'Bonk',
    symbol: 'BONK',
    knownSafe: true
  }
};

const verifiedTokensCache = new Map<string, boolean>();

export interface RiskAnalysis {
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
}

export class RiskEngineService {
  public async analyzeTokenRisk(tokenInfo: TokenInfo, additionalData?: any): Promise<RiskAnalysis> {
    try {
      if (WHITELISTED_TOKENS[tokenInfo.address]) {
        return {
          riskScore: 0,
          riskLevel: 'Safe',
          riskFactors: [],
        };
      }

      let isVerified = verifiedTokensCache.get(tokenInfo.address);
      
      if (isVerified === undefined) {
        isVerified = await isVerifiedToken(tokenInfo.address);
        verifiedTokensCache.set(tokenInfo.address, isVerified);
      }
      
      if (isVerified) {
        return {
          riskScore: 0,
          riskLevel: 'Safe',
          riskFactors: [],
        };
      }

      let totalRiskScore = 0;
      const riskFactors: string[] = [];

      if (tokenInfo.mintAuthority) {
        totalRiskScore += RISK_FACTORS.MINT_AUTHORITY_ACTIVE;
        riskFactors.push('Mint authority is not revoked - Owner can create unlimited tokens');
      }

      if (tokenInfo.freezeAuthority) {
        totalRiskScore += RISK_FACTORS.FREEZE_AUTHORITY_ACTIVE;
        riskFactors.push('Freeze authority is active - Owner can freeze user tokens');
      }

      if (tokenInfo.tokenAgeDays !== null) {
        if (tokenInfo.tokenAgeDays < 7) {
          totalRiskScore += RISK_FACTORS.RECENT_CREATION;
          riskFactors.push(`Token was created only ${tokenInfo.tokenAgeDays} days ago`);
        }
      }
    
      if (tokenInfo.supply && !isNaN(parseFloat(tokenInfo.supply))) {
        const totalSupply = parseFloat(tokenInfo.supply);
     
        if (totalSupply > 1_000_000_000_000) {
          totalRiskScore += RISK_FACTORS.LOW_SUPPLY;
          riskFactors.push('Extremely high total supply - common in low-quality tokens');
        }
      }
   
      const riskLevel = this.getRiskLevel(totalRiskScore);

      return {
        riskScore: totalRiskScore,
        riskLevel,
        riskFactors,
      };
    } catch (error) {
      console.error('Error analyzing token risk:', error);
      throw error;
    }
  }

  private getRiskLevel(riskScore: number): string {
    if (riskScore < RISK_THRESHOLDS.SAFE) {
      return 'Safe';
    } else if (riskScore < RISK_THRESHOLDS.CAUTION) {
      return 'Caution';
    } else if (riskScore < RISK_THRESHOLDS.HIGH_RISK) {
      return 'High Risk';
    } else {
      return 'Likely Scam';
    }
  }
}



