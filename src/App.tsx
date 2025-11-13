import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import VideoPane from './ui/VideoPane'
import Controls from './ui/Controls'
import ChatPane from './ui/ChatPane'
import { SignalingClient } from './signaling/client'
import { RtcSession } from './webrtc/rtc'

type Msg = { from: 'me' | 'peer' | 'system'; text: string; ts: number }

function App() {
  const [status, setStatus] = useState<'idle' | 'searching' | 'connected'>('idle')
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [remote, setRemote] = useState<MediaStream | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const rtcRef = useRef<RtcSession | null>(null)
  const [chatReady, setChatReady] = useState(false)
  const [stats, setStats] = useState<{ waiting: number; pairs: number; total: number } | null>(null)
  const [typingActive, setTypingActive] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [interests] = useState<string[]>([])

  const signaling = useMemo(() => new SignalingClient(), [])

  function addSystemMessage(text: string) {
    setMessages((p) => [...p, { from: 'system', text, ts: Date.now() }])
  }

  useEffect(() => {
    const offOpen = signaling.on('open', () => {
      addSystemMessage('Connected to server')
    })
    const offClosed = signaling.on('closed', () => {
      setStatus('idle')
      addSystemMessage('Disconnected from server')
    })
    const offPaired = signaling.on('paired', async (m: any) => {
      addSystemMessage('Found a stranger! Connecting...')
      const rtc = new RtcSession({
        onLocalStream: (s) => setLocal(s),
        onRemoteStream: (s) => {
          setRemote(s)
          addSystemMessage('Stranger\'s video connected')
        },
        onMessage: (t) => setMessages((p) => [...p, { from: 'peer', text: t, ts: Date.now() }]),
        onConnected: () => {
          setStatus('connected')
          addSystemMessage('Connected to stranger! You can now chat.')
        },
        onDisconnected: () => {
          setStatus('idle')
          setChatReady(false)
          addSystemMessage('Connection lost')
        },
        onReady: () => {
          setChatReady(true)
          addSystemMessage('Chat is ready')
        },
        onTyping: (active) => {
          setTypingActive(!!active)
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          if (active) typingTimerRef.current = setTimeout(() => setTypingActive(false), 2000)
        },
      }, (data) => signaling.signal(data))
      rtcRef.current = rtc
      let media: MediaStream | null = null
      try {
        addSystemMessage('Requesting camera and microphone access...')
        media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        addSystemMessage('Camera and microphone access granted')
      } catch (err) {
        addSystemMessage('Camera/microphone access denied or unavailable')
      }
      if (media) await rtc.attachLocal(media)
      setChatReady(true)
      if (m.initiator) {
        rtc.initDataChannel('chat')
        await rtc.startOffer()
      } else {
        rtc.onDataChannel()
      }
    })
    const offSignal = signaling.on('signal', async (m: any) => {
      if (rtcRef.current) await rtcRef.current.handleSignal(m.data)
    })
    const offLeft = signaling.on('partner_left', () => {
      rtcRef.current?.close()
      rtcRef.current = null
      setRemote(null)
      setStatus('idle')
      setChatReady(false)
      addSystemMessage('Stranger disconnected')
    })
    const offStats = signaling.on('stats', (m: any) => {
      setStats({ waiting: m.waiting, pairs: m.pairs, total: m.total })
    })
    signaling.connect()
    return () => { offOpen(); offClosed(); offPaired(); offSignal(); offLeft(); offStats() }
  }, [signaling])

  function handleFind() {
    setMessages([])
    setRemote(null)
    setStatus('searching')
    setChatReady(false)
    addSystemMessage('Looking for someone to chat with...')
    signaling.setInterests(interests)
    signaling.find()
  }

  function handleNext() {
    addSystemMessage('Looking for a new stranger...')
    setMessages([])
    setRemote(null)
    rtcRef.current?.close()
    rtcRef.current = null
    setStatus('searching')
    setChatReady(false)
    signaling.next()
  }

  function handleLeave() {
    setStatus('idle')
    addSystemMessage('You disconnected')
    signaling.leave()
    rtcRef.current?.close()
    rtcRef.current = null
    setRemote(null)
    setChatReady(false)
  }

  function handleSend(text: string) {
    rtcRef.current?.sendChat(text)
    setMessages((p) => [...p, { from: 'me', text, ts: Date.now() }])
  }

  function handleTyping(active: boolean) {
    rtcRef.current?.sendTyping(active)
  }

  return (
    <div className="app">
      <div className="main">
        <VideoPane local={local} remote={remote} />
        <div className="chat-column">
          <Controls status={status} onFind={handleFind} onNext={handleNext} onLeave={handleLeave} />
          <ChatPane messages={messages} onSend={handleSend} disabled={!chatReady} typingActive={typingActive} onTyping={handleTyping} />
        </div>
      </div>
      {stats && (
        <div className="stats">
          <span>Waiting: {stats.waiting}</span>
          <span>Pairs: {stats.pairs}</span>
          <span>Total: {stats.total}</span>
        </div>
      )}
    </div>
  )
}

export default App
