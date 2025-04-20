import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { TokenAnalysisService } from '../services/tokenAnalysisService';

export class WebSocketServer {
  private io: SocketIOServer;
  private tokenAnalysisService: TokenAnalysisService;
  
  constructor(server: Server, tokenAnalysisService: TokenAnalysisService) {
    this.tokenAnalysisService = tokenAnalysisService;

    this.io = new SocketIOServer(server, {
      cors: {
origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {

    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('monitor-token', async (tokenAddress: string) => {
        try {

          socket.join(`token:${tokenAddress}`);
          
          console.log(`Client ${socket.id} subscribed to token: ${tokenAddress}`);

          const analysis = await this.tokenAnalysisService.analyzeToken(tokenAddress);

          socket.emit('token-analysis', {
            tokenAddress,
            analysis,
          });
        } catch (error) {
          console.error(`Error monitoring token ${tokenAddress}:`, error);
          socket.emit('error', {
            message: `Failed to monitor token: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      });

      socket.on('stop-monitor-token', async (tokenAddress: string) => {
        try {

          socket.leave(`token:${tokenAddress}`);
          
          console.log(`Client ${socket.id} unsubscribed from token: ${tokenAddress}`);
        } catch (error) {
          console.error(`Error stopping monitoring for token ${tokenAddress}:`, error);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    this.tokenAnalysisService.on('analysis', (data) => {
      const { tokenAddress, analysis } = data;
      this.io.to(`token:${tokenAddress}`).emit('token-analysis', {
        tokenAddress,
        analysis,
      });
    });

    this.tokenAnalysisService.on('transaction', (data) => {
      const { tokenAddress, transaction } = data;
      this.io.to(`token:${tokenAddress}`).emit('token-transaction', {
        tokenAddress,
        transaction,
      });
    });
  }
}