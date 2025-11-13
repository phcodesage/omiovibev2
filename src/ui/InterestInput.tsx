import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'

type Props = {
  interests: string[]
  onInterestsChange: (interests: string[]) => void
  disabled?: boolean
}

export default function InterestInput({ interests, onInterestsChange, disabled = false }: Props) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const addInterest = (interest: string) => {
    const trimmed = interest.trim()
    if (trimmed && !interests.includes(trimmed)) {
      onInterestsChange([...interests, trimmed])
    }
    setInputValue('')
  }

  const removeInterest = (interest: string) => {
    onInterestsChange(interests.filter(i => i !== interest))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault()
      addInterest(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && interests.length > 0) {
      removeInterest(interests[interests.length - 1])
    }
  }

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  return (
    <div className="interest-input">
      <div className="interest-label">Interests (optional):</div>
      <div className="interest-container">
        {interests.map((interest, index) => (
          <div key={index} className="interest-tag">
            <span>{interest}</span>
            <button 
              type="button" 
              onClick={() => removeInterest(interest)}
              disabled={disabled}
              className="interest-remove"
            >
              ×
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={interests.length === 0 ? "Add interests (e.g., music, gaming)" : ""}
          disabled={disabled}
          className="interest-text-input"
        />
      </div>
      <div className="interest-help">
        Press Enter to add an interest. Users with matching interests will be paired first.
      </div>
    </div>
  )
}
