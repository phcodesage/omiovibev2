import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import VideoPane from './ui/VideoPane'
import Controls from './ui/Controls'
import ChatPane from './ui/ChatPane'
import { SignalingClient } from './signaling/client'
import { RtcSession } from './webrtc/rtc'

type Msg = { from: 'me' | 'peer'; text: string; ts: number }

function App() {
  const [status, setStatus] = useState<'idle' | 'searching' | 'connected'>('idle')
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [remote, setRemote] = useState<MediaStream | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const rtcRef = useRef<RtcSession | null>(null)
  const [chatReady, setChatReady] = useState(false)
  const [stats, setStats] = useState<{ waiting: number; pairs: number; total: number } | null>(null)
  const [peerName, setPeerName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameOk, setNameOk] = useState(false)
  const [typingActive, setTypingActive] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const signaling = useMemo(() => new SignalingClient(), [])

  useEffect(() => {
    const offOpen = signaling.on('open', () => {})
    const offClosed = signaling.on('closed', () => {
      setStatus('idle')
    })
    const offPaired = signaling.on('paired', async (m: any) => {
      setPeerName(m.peerName || null)
      const rtc = new RtcSession({
        onLocalStream: (s) => setLocal(s),
        onRemoteStream: (s) => setRemote(s),
        onMessage: (t) => setMessages((p) => [...p, { from: 'peer', text: t, ts: Date.now() }]),
        onConnected: () => setStatus('connected'),
        onDisconnected: () => { setStatus('idle'); setChatReady(false) },
        onReady: () => setChatReady(true),
        onTyping: (active) => {
          setTypingActive(!!active)
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
          if (active) typingTimerRef.current = setTimeout(() => setTypingActive(false), 2000)
        },
      }, (data) => signaling.signal(data))
      rtcRef.current = rtc
      let media: MediaStream | null = null
      try {
        media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {}
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
      setPeerName(null)
    })
    const offStats = signaling.on('stats', (m: any) => {
      setStats({ waiting: m.waiting, pairs: m.pairs, total: m.total })
    })
    const offNameSet = signaling.on('name_set', (m: any) => {
      setName(m.name || '')
      setNameOk(!!(m.name && String(m.name).length > 0))
    })
    const offError = signaling.on('error', (m: any) => {
      if (m.code === 'invalid_name') setNameOk(false)
      if (m.code === 'name_required') setStatus('idle')
    })
    signaling.connect()
    return () => { offOpen(); offClosed(); offPaired(); offSignal(); offLeft(); offStats(); offNameSet(); offError() }
  }, [signaling])

  function handleFind() {
    setMessages([])
    setRemote(null)
    setStatus('searching')
    setChatReady(false)
    setPeerName(null)
    signaling.find()
  }

  function handleNext() {
    setMessages([])
    setRemote(null)
    rtcRef.current?.close()
    rtcRef.current = null
    setStatus('searching')
    setChatReady(false)
    setPeerName(null)
    signaling.next()
  }

  function handleLeave() {
    setStatus('idle')
    signaling.leave()
    rtcRef.current?.close()
    rtcRef.current = null
    setRemote(null)
    setChatReady(false)
    setPeerName(null)
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
      <Controls status={status} onFind={handleFind} onNext={handleNext} onLeave={handleLeave} name={name} onNameChange={setName} onSetName={() => signaling.setName(name)} nameOk={nameOk} />
      <div className="main">
        <VideoPane local={local} remote={remote} />
        {peerName && <div className="peer">Connected with {peerName}</div>}
        <ChatPane messages={messages} onSend={handleSend} disabled={!chatReady} typingActive={typingActive} onTyping={handleTyping} />
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
