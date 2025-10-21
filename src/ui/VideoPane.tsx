import { useEffect, useRef } from 'react'

type Props = {
  local?: MediaStream | null
  remote?: MediaStream | null
  peerLabel?: string | null
}

export default function VideoPane({ local, remote, peerLabel }: Props) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = local || null
  }, [local])

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remote || null
  }, [remote])

  return (
    <div className="video-stack">
      <div className="box">
        <div className="label">{peerLabel || 'Stranger'}</div>
        <video ref={remoteRef} autoPlay playsInline className="video" />
      </div>
      <div className="box">
        <div className="label">You</div>
        <video ref={localRef} autoPlay playsInline muted className="video" />
      </div>
    </div>
  )
}
