import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Backspace } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleKey = (key: string) => {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      setError(false)
      return
    }
    if (pin.length >= 6) return
    const next = pin + key
    setPin(next)
    setError(false)

    if (next.length >= 4) {
      const success = login(next)
      if (success) {
        navigate('/catalog')
      } else if (next.length === 6) {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 800)
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-6">
      {/* Logo */}
      <div className="mb-12 text-center">
        <img
          src="/assets/brand/logo-horizontal.png"
          alt="VZLAUNCHER"
          className="h-10 object-contain mx-auto mb-4"
        />
        <p className="text-[#888888] text-sm font-medium">Enter your operator PIN</p>
      </div>

      {/* PIN display */}
      <div className={`flex gap-3 mb-10 transition-all ${error ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? error
                  ? 'bg-[#FF2D2D] border-[#FF2D2D]'
                  : 'bg-[#E5007E] border-[#E5007E]'
                : 'border-[#2A2A2A] bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {PIN_KEYS.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              className="h-16 rounded-xl bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] font-semibold text-xl flex items-center justify-center hover:border-[#E5007E] hover:text-[#E5007E] transition-all duration-150 active:scale-95 cursor-pointer"
            >
              {key === 'del' ? <Backspace size={24} weight="thin" /> : key}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-[#FF2D2D] text-sm mt-6 font-medium">Incorrect PIN. Try again.</p>
      )}

      <p className="text-[#2A2A2A] text-xs mt-16">Virtual Zone Italia · VZLAUNCHER v1.0</p>
    </div>
  )
}
