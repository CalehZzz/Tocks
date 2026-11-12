import { useEffect, useState, type FormEvent } from 'react'
import { UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useToast } from '../components/Toast'

export function AccountPage() {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.display_name || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(user?.display_name || '')
  }, [user?.display_name])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.updateProfile({ display_name: name.trim() })
      await refresh()
      toast('Perfil actualizado')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Tu cuenta</h1>
          <p className="page-sub">Datos de acceso y perfil</p>
        </div>
      </div>
      <form className="panel panel-pad" style={{ maxWidth: 480 }} onSubmit={onSave}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
          <UserRound size={18} /> Perfil
        </h3>
        <div className="field">
          <label>Correo</label>
          <input value={user?.email || ''} disabled />
        </div>
        <div className="field">
          <label>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}
