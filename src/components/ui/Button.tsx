import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

const styles = {
  base: 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none',
  variant: {
    primary: 'bg-[#E5007E] text-white hover:bg-[#FF1A95] hover:shadow-[0_0_24px_#E5007E66] active:bg-[#7A0044]',
    secondary: 'bg-transparent text-[#F5F5F5] border border-[#2A2A2A] hover:border-[#E5007E] hover:text-[#E5007E]',
    danger: 'bg-[#FF2D2D] text-white hover:brightness-110 active:brightness-90',
  },
  size: {
    sm: 'h-10 px-4 text-sm rounded-lg',
    md: 'h-14 px-6 text-base',
    lg: 'h-16 px-8 text-lg',
  },
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${styles.base} ${styles.variant[variant]} ${styles.size[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
