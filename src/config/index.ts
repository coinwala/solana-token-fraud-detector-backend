import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  environment: process.env.ENVIRONMENT || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  heliusApiKey: process.env.HELIUS_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  llm: {
    model: process.env.LLM_MODEL || 'mistralai/mistral-7b-instruct',
    apiUrl: process.env.LLM_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
    cacheExpiryMs: parseInt(process.env.LLM_CACHE_EXPIRY_MS || (60 * 60 * 1000).toString(), 10),
  }
};

const requiredConfigs = ['heliusApiKey', 'solanaRpcUrl'];
for (const configKey of requiredConfigs) {
  if (!config[configKey as keyof typeof config]) {
    console.error(`Missing required configuration: ${configKey}`);
    process.exit(1);
  }
}

export default config;