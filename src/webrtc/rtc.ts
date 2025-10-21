export type RtcEvents = {
  onLocalStream?: (stream: MediaStream) => void
  onRemoteStream?: (stream: MediaStream) => void
  onMessage?: (text: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onReady?: () => void
  onTyping?: (active: boolean) => void
}

export class RtcSession {
  private pc: RTCPeerConnection
  private dc: RTCDataChannel | null = null
  private local: MediaStream | null = null
  private remote: MediaStream | null = null
  private events: RtcEvents
  private signal: (data: any) => void
  private messageQueue: string[] = []

  constructor(events: RtcEvents, signalSend: (data: any) => void) {
    this.events = events
    this.signal = signalSend
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    })

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.signal({ candidate: e.candidate })
    }

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'connected') this.events.onConnected?.()
      if (['disconnected', 'failed', 'closed'].includes(this.pc.connectionState)) this.events.onDisconnected?.()
    }

    this.pc.ontrack = (e) => {
      if (!this.remote) this.remote = new MediaStream()
      this.remote.addTrack(e.track)
      this.events.onRemoteStream?.(this.remote)
    }
  }

  async attachLocal(stream: MediaStream) {
    this.local = stream
    for (const track of stream.getTracks()) this.pc.addTrack(track, stream)
    this.events.onLocalStream?.(stream)
  }

  initDataChannel(label = 'chat') {
    this.dc = this.pc.createDataChannel(label)
    this.bindDc()
  }

  bindDc() {
    if (!this.dc) return
    this.dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(String(e.data))
        if (msg && msg.type === 'chat' && typeof msg.text === 'string') this.events.onMessage?.(msg.text)
        else if (msg && msg.type === 'typing' && typeof msg.active === 'boolean') this.events.onTyping?.(!!msg.active)
        else this.events.onMessage?.(String(e.data))
      } catch {
        this.events.onMessage?.(String(e.data))
      }
    }
    this.dc.onopen = () => {
      for (const m of this.messageQueue) {
        try { this.dc?.send(m) } catch {}
      }
      this.messageQueue = []
      this.events.onReady?.()
    }
  }

  onDataChannel() {
    this.pc.ondatachannel = (e) => {
      this.dc = e.channel
      this.bindDc()
    }
  }

  async startOffer() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.signal({ sdp: this.pc.localDescription })
  }

  async handleSignal(msg: any) {
    if (msg.sdp) {
      const desc = new RTCSessionDescription(msg.sdp)
      const isOffer = desc.type === 'offer'
      await this.pc.setRemoteDescription(desc)
      if (isOffer) {
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        this.signal({ sdp: this.pc.localDescription })
      }
      return
    }
    if (msg.candidate) {
      try { await this.pc.addIceCandidate(msg.candidate) } catch {}
      return
    }
  }

  sendMessage(text: string) {
    this.sendChat(text)
  }

  sendChat(text: string) {
    const payload = JSON.stringify({ type: 'chat', text })
    if (this.dc && this.dc.readyState === 'open') this.dc.send(payload)
    else this.messageQueue.push(payload)
  }

  sendTyping(active: boolean) {
    const payload = JSON.stringify({ type: 'typing', active: !!active })
    if (this.dc && this.dc.readyState === 'open') this.dc.send(payload)
  }

  async close() {
    try { this.dc?.close() } catch {}
    try { this.pc.close() } catch {}
    for (const t of this.local?.getTracks() || []) t.stop()
  }
}
