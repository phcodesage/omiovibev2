import { useEffect, useRef } from 'react'

type Message = { from: 'me' | 'peer'; text: string; ts: number }

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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  function handleSend() {
    const v = inputRef.current?.value?.trim()
    if (!v) return
    onSend(v)
    if (inputRef.current) inputRef.current.value = ''
    onTyping?.(false)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

   function handleChange() {
     onTyping?.(true)
   }

  return (
    <div className="chat-pane">
      <div className="messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>
            <span className="text">{m.text}</span>
            <span className="ts">{new Date(m.ts).toLocaleTimeString()}</span>
          </div>
        ))}
        {typingActive && <div className="typing">Partner is typing…</div>}
      </div>
      <div className="composer">
        <input ref={inputRef} placeholder="Type a message" onKeyDown={handleKey} onChange={handleChange} onBlur={() => onTyping?.(false)} disabled={disabled} />
        <button onClick={handleSend} disabled={disabled}>Send</button>
      </div>
    </div>
  )
}
