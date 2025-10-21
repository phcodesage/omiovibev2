import { useEffect, useRef } from 'react'

type Props = {
  local?: MediaStream | null
  remote?: MediaStream | null
}

export default function VideoPane({ local, remote }: Props) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = local || null
  }, [local])

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remote || null
  }, [remote])

  return (
    <div className="video-pane">
      <video ref={remoteRef} autoPlay playsInline className="video remote" />
      <video ref={localRef} autoPlay playsInline muted className="video local" />
    </div>
  )
}
