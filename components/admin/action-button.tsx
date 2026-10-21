"use client"

import { useFormStatus } from 'react-dom'

interface Props {
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  confirmMessage?: string
  title?: string
  'aria-label'?: string
}

/**
 * Botão de submit para forms de Server Action:
 * - mostra estado de processamento (evita duplo clique)
 * - pede confirmação em ações destrutivas
 */
export default function ActionButton({
  children,
  className,
  pendingLabel,
  confirmMessage,
  title,
  'aria-label': ariaLabel,
}: Props) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
    >
      {pending ? (pendingLabel ?? 'Aguarde...') : children}
    </button>
  )
}
