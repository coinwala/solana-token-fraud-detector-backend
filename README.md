# Solana Token Fraud Detector

A real-time monitoring and analysis tool that helps detect suspicious activities and potential fraud in Solana token transactions.

## Features

- Real-time transaction monitoring for Solana tokens
- Automated suspicious activity detection
- Transaction history analysis
- API integration with Helius for comprehensive transaction data
- LLM-powered fraud pattern recognition

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/solana-token-fraud-detector.git
cd solana-token-fraud-detector

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
# Environment
ENVIRONMENT=development
PORT=3001

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_API_KEY=your_helius_api_key_here

# LLM Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=mistralai/mistral-7b-instruct
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.1
LLM_CACHE_EXPIRY_MS=3600000
```

## Usage

Start the application:

```bash
npm start
```

For development with hot reloading:

```bash
npm run dev
```

## API Endpoints

- `POST /api/token/monitor` - Start monitoring a specific token
- `POST /api/token/analyze` - Analyze transaction history for a token
- `GET /api/token/:address/transactions` - Get recent transactions for a token

## How It Works

The system monitors Solana token transactions in real-time by:

1. Subscribing to token account changes on the Solana blockchain
2. Fetching transaction details using Helius API
3. Analyzing transaction patterns to detect suspicious activity
4. Providing alerts and reports on potential fraud

## Dependencies

- Node.js
- Solana Web3.js
- Helius API
- OpenRouter API (for LLM integration)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 