import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const CONFIRM_WORD = 'confirmar'

interface Props {
  open: boolean
  title: string
  dangerText: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: () => Promise<void> | void
  children?: ReactNode
}

export function ConfirmTypeModal({
  open,
  title,
  dangerText,
  confirmLabel = 'Confirmar acción',
  onClose,
  onConfirm,
  children,
}: Props) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTyped('')
      setError('')
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (typed.trim().toLowerCase() !== CONFIRM_WORD) {
      setError(`Escribe exactamente “${CONFIRM_WORD}”`)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h3>
            <AlertTriangle size={18} color="var(--danger)" />
            {title}
          </h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <p className="danger-text">{dangerText}</p>
        {children}
        <form onSubmit={submit}>
          <div className="field">
            <label>
              Escribe <strong>{CONFIRM_WORD}</strong> para continuar
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
              autoComplete="off"
            />
          </div>
          {error ? <div className="error-box">{error}</div> : null}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={busy || typed.trim().toLowerCase() !== CONFIRM_WORD}
            >
              {busy ? 'Procesando…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
