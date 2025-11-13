type Handler = (payload: any) => void

export class SignalingClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<Handler>>()
  private url: string
  private interests: string[] = []

  constructor(url = `ws://localhost:3001`) {
    this.url = url
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this.ws = new WebSocket(this.url)
    this.ws.onmessage = (ev) => {
      let msg: any
      try { msg = JSON.parse(ev.data) } catch { return }
      this.emit(msg.type, msg)
    }
    this.ws.onclose = () => {
      this.emit('closed', {})
    }
    this.ws.onopen = () => {
      this.emit('open', {})
      this.stats()
    }
  }

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)!.delete(handler)
  }

  private emit(type: string, payload: any) {
    const set = this.handlers.get(type)
    if (!set) return
    for (const h of set) h(payload)
  }

  private send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(obj))
  }

  find() { this.send({ type: 'find', interests: this.interests }) }
  next() { this.send({ type: 'next' }) }
  leave() { this.send({ type: 'leave' }) }
  signal(data: any) { this.send({ type: 'signal', data }) }
  stats() { this.send({ type: 'stats' }) }
  setName(name: string) { this.send({ type: 'set_name', name }) }
  
  setInterests(interests: string[]) {
    this.interests = interests.filter(i => i.trim().length > 0)
  }
  
  getInterests(): string[] {
    return [...this.interests]
  }
}
