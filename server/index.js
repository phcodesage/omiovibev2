import { WebSocketServer } from 'ws'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001
const wss = new WebSocketServer({ port: PORT })

// Store waiting users with their interests
const waiting = []
const partners = new Map()
const userInterests = new Map()
let totalPairs = 0

function pair(a, b) {
  partners.set(a, b)
  partners.set(b, a)
  try { a.send(JSON.stringify({ type: 'paired', initiator: true, peerId: idOf(b), peerName: nameOf(b) })) } catch {}
  try { b.send(JSON.stringify({ type: 'paired', initiator: false, peerId: idOf(a), peerName: nameOf(a) })) } catch {}
  totalPairs += 1
  broadcastStats()
}

function idOf(ws) {
  return ws._id || (ws._id = Math.random().toString(36).slice(2, 10))
}

function nameOf(ws) {
  return ws._name || (ws._name = `user-${idOf(ws)}`)
}

function unpair(ws) {
  const p = partners.get(ws)
  if (p) {
    partners.delete(ws)
    partners.delete(p)
    try { p.send(JSON.stringify({ type: 'partner_left' })) } catch {}
  }
  broadcastStats()
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    switch (msg.type) {
      case 'find': {
        if (partners.has(ws)) unpair(ws)
        
        // Store user's interests if provided
        if (msg.interests && Array.isArray(msg.interests)) {
          const cleanInterests = msg.interests
            .filter(i => typeof i === 'string')
            .map(i => i.toLowerCase().trim())
            .filter(i => i.length > 0)
          
          if (cleanInterests.length > 0) {
            userInterests.set(ws, cleanInterests)
          } else {
            userInterests.delete(ws)
          }
        }
        
        // Try to find a match based on interests
        const myInterests = userInterests.get(ws) || []
        
        if (myInterests.length > 0 && waiting.length > 0) {
          // Find the best match based on shared interests
          let bestMatch = -1
          let maxSharedInterests = -1
          
          for (let i = 0; i < waiting.length; i++) {
            const other = waiting[i]
            if (other && other.readyState === other.OPEN) {
              const otherInterests = userInterests.get(other) || []
              if (otherInterests.length > 0) {
                // Count shared interests
                const sharedCount = myInterests.filter(interest => 
                  otherInterests.includes(interest)
                ).length
                
                if (sharedCount > maxSharedInterests) {
                  maxSharedInterests = sharedCount
                  bestMatch = i
                }
              }
            }
          }
          
          if (bestMatch >= 0) {
            const other = waiting.splice(bestMatch, 1)[0]
            pair(ws, other)
          } else {
            waiting.push(ws)
          }
        } else if (waiting.length > 0) {
          // Fall back to random matching if no interest match found
          const other = waiting.shift()
          if (other && other.readyState === other.OPEN) {
            pair(ws, other)
          } else {
            waiting.push(ws)
          }
        } else {
          waiting.push(ws)
        }
        
        broadcastStats()
        break
      }
      case 'signal': {
        const p = partners.get(ws)
        if (p && p.readyState === p.OPEN) {
          try { p.send(JSON.stringify({ type: 'signal', data: msg.data })) } catch {}
        }
        break
      }
      case 'next': {
        const hadPartner = partners.has(ws)
        unpair(ws)
        waiting.push(ws)
        if (hadPartner) {}
        if (waiting.length >= 2) {
          const a = waiting.shift()
          const b = waiting.shift()
          if (a && b && a.readyState === a.OPEN && b.readyState === b.OPEN) pair(a, b)
        }
        broadcastStats()
        break
      }
      case 'leave': {
        unpair(ws)
        broadcastStats()
        break
      }
      case 'stats': {
        sendStats(ws)
        break
      }
    }
  })

  ws.on('close', () => {
    const idx = waiting.indexOf(ws)
    if (idx >= 0) waiting.splice(idx, 1)
    unpair(ws)
    userInterests.delete(ws)
    broadcastStats()
  })

  sendStats(ws)
})

console.log(`[signaling] ws listening on ws://localhost:${PORT}`)

function statsObj() {
  return { type: 'stats', waiting: waiting.length, pairs: partners.size / 2, total: totalPairs }
}

function sendStats(ws) {
  try { ws.send(JSON.stringify(statsObj())) } catch {}
}

function broadcastStats() {
  const payload = JSON.stringify(statsObj())
  for (const c of wss.clients) {
    if (c.readyState === c.OPEN) {
      try { c.send(payload) } catch {}
    }
  }
}

function validateName(s) {
  if (typeof s !== 'string') return ''
  let t = s.trim().slice(0, 24)
  t = t.replace(/[^a-zA-Z0-9_-]/g, '')
  if (t.length < 3) return ''
  return t
}
