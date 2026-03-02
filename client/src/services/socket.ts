import type { ServerEvent } from '../types/events';

const WS_URL = 'ws://localhost:3000/ws';

type EventHandler = (event: ServerEvent) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<EventHandler> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentMatchId: string | null = null;
  private currentPlayerId: string | null = null;

  connect(matchId: string, playerId: string) {
    this.disconnect();
    
    this.currentMatchId = matchId;
    this.currentPlayerId = playerId;
    
    this.ws = new WebSocket(WS_URL);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.send({
        type: 'join_match',
        matchId,
        playerId,
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ServerEvent;
        this.handlers.forEach(handler => handler(data));
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    if (!this.currentMatchId || !this.currentPlayerId) return;
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.currentMatchId && this.currentPlayerId) {
        this.connect(this.currentMatchId, this.currentPlayerId);
      }
    }, 3000);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      if (this.currentMatchId && this.currentPlayerId) {
        this.send({
          type: 'leave_match',
          matchId: this.currentMatchId,
          playerId: this.currentPlayerId,
        });
      }
      this.ws.close();
      this.ws = null;
    }
    
    this.currentMatchId = null;
    this.currentPlayerId = null;
  }

  send(event: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  subscribe(handler: EventHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
