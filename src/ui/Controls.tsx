type Props = {
  status: string
  onFind: () => void
  onNext: () => void
  onLeave: () => void
  name: string
  onNameChange: (v: string) => void
  onSetName: () => void
  nameOk: boolean
}

export default function Controls({ status, onFind, onNext, onLeave, name, onNameChange, onSetName, nameOk }: Props) {
  return (
    <div className="controls">
      <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Enter name" />
      <button onClick={onSetName}>Set</button>
      <button onClick={onFind} disabled={!nameOk || status === 'searching' || status === 'connected'}>Start</button>
      <button onClick={onNext} disabled={status !== 'connected'}>Next</button>
      <button onClick={onLeave} disabled={status === 'idle'}>Leave</button>
      <span className="status">{status}</span>
    </div>
  )
}
