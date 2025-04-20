import express from 'express';
import cors from 'cors';
import http from 'http';
import config from './config';
import tokenRoutes from './routes/tokenRoutes';
import { WebSocketServer } from './utils/webSocketServer';
import { tokenAnalysisService } from './controllers/tokenController';
import { testHeliusConnection } from './utils/solanaConnector';

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wsServer = new WebSocketServer(server, tokenAnalysisService);

// Middleware
app.use(express.json());
app.use(cors());

// API routes
app.use('/api/tokens', tokenRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Solana Token Fraud Detector API' });
});

// API Key status route
app.get('/api/status', async (req, res) => {
  const heliusConnected = await testHeliusConnection();
  
  res.json({
    status: 'online',
    heliusApiKey: {
      configured: !!config.heliusApiKey,
      working: heliusConnected
    },
    llmApiKey: {
      configured: !!config.openrouterApiKey,
    }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Something went wrong'
  });
});

// Start server
server.listen(config.port, async () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.environment}`);
  
  // Test Helius connection on startup
  const heliusConnected = await testHeliusConnection();
  if (!heliusConnected) {
    console.error('WARNING: Helius API connection failed. Please check your API key.');
    console.error('The application will continue to run but Solana-related features will not work correctly.');
  }
});