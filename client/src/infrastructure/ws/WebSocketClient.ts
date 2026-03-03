export class WebSocketClient {
  private socket?: WebSocket
  private listeners = new Map<string, Array<(payload: unknown) => void>>()

  connect(url: string, onOpen?: () => void): void {
    if (this.socket) {
      this.socket.close()
    }
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      onOpen?.()
    }

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; [key: string]: unknown }
        this.emit(msg.type, msg)
      } catch (e) {
        console.error("Failed to parse WS message:", e)
      }
    }

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    this.socket.onclose = () => {
      console.log("WebSocket closed")
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = undefined
    }
  }

  send(type: string, payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...((payload as object) ?? {}) }))
    }
  }

  on<T>(type: string, handler: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    const handlers = this.listeners.get(type)!
    const h = handler as (payload: unknown) => void
    handlers.push(h)
    return () => {
      const idx = handlers.indexOf(h)
      if (idx !== -1) handlers.splice(idx, 1)
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private emit(type: string, payload: unknown): void {
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.forEach((h) => h(payload))
    }
  }
}
