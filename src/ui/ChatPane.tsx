import { useEffect, useRef, useState } from 'react'

type Message = { from: 'me' | 'peer' | 'system'; text: string; ts: number }

type Props = {
  messages: Message[]
  onSend: (text: string) => void
  disabled?: boolean
  typingActive?: boolean
  onTyping?: (active: boolean) => void
}

export default function ChatPane({ messages, onSend, disabled, typingActive, onTyping }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const emojis = ['😀','😃','😄','😁','😆','🥹','😂','🤣','😊','😉','😍','😘','😜','🤪','🤗','🤔','🤨','😐','😑','😶','🙄','😏','😴','🤤','🥱','😷','🤒','🤕','🤧','🥳','🤯','😎','🫠','😤','😮‍💨','😮','😲','😳','🥺','😬','😭','😡','😇','🤝','👍','👎','🙏','👏','🙌','🔥','💯','✅','❌','❤️','💙','💚','💛','💜','🖤','🤍','🤎','✨','🌟']

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (!showEmojis) return
    function handleDocMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (pickerRef.current && pickerRef.current.contains(t)) return
      if (btnRef.current && btnRef.current.contains(t)) return
      setShowEmojis(false)
    }
    document.addEventListener('mousedown', handleDocMouseDown)
    return () => document.removeEventListener('mousedown', handleDocMouseDown)
  }, [showEmojis])

  function handleSend() {
    const v = inputRef.current?.value?.trim()
    if (!v) return
    onSend(v)
    if (inputRef.current) inputRef.current.value = ''
    onTyping?.(false)
    setShowEmojis(false)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  function handleChange() {
    onTyping?.(true)
  }

  function toggleEmojis() {
    setShowEmojis((v) => !v)
    inputRef.current?.focus()
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const before = el.value.slice(0, start)
    const after = el.value.slice(end)
    el.value = before + emoji + after
    const pos = start + emoji.length
    try { el.setSelectionRange(pos, pos) } catch {}
    onTyping?.(true)
    el.focus()
  }

  return (
    <div className="chat-pane">
      <div className="messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            {m.from !== 'system' && <span className="who">{m.from === 'me' ? 'You' : 'Stranger'}:</span>}
            <span className="text">{m.text}</span>
            <span className="ts">{new Date(m.ts).toLocaleTimeString()}</span>
          </div>
        ))}
        {typingActive && <div className="typing">Partner is typing…</div>}
      </div>
      <div className="composer">
        <button type="button" className="emoji-btn" onClick={toggleEmojis} disabled={disabled} ref={btnRef}>😊</button>
        <input ref={inputRef} placeholder="Type a message" onKeyDown={handleKey} onChange={handleChange} onBlur={() => onTyping?.(false)} disabled={disabled} />
        <button onClick={handleSend} disabled={disabled}>Send</button>
        {showEmojis && (
          <div className="emoji-picker" ref={pickerRef}>
            {emojis.map((e) => (
              <button key={e} type="button" onClick={() => insertEmoji(e)}>{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
