type Props = {
  status: string
  onFind: () => void
  onNext: () => void
  onLeave: () => void
}

export default function Controls({ status, onFind, onNext, onLeave }: Props) {
  return (
    <div className="controls">
      <button onClick={onFind} disabled={status === 'searching' || status === 'connected'}>Start</button>
      <button onClick={onNext} disabled={status !== 'connected'}>Next</button>
      <button onClick={onLeave} disabled={status === 'idle'}>Leave</button>
      <span className="status">{status}</span>
    </div>
  )
}
