import { useMemo, useState, type FormEvent } from 'react'
import { Copy, Link2, Trash2, UserPlus, Users } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { ConfirmTypeModal } from '../components/ConfirmTypeModal'

function posLink(slug: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}/caja/${slug}`
}

export function TeamPage() {
  const { store, members, invites, createInvite, deleteInvite, removeMember } = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [busy, setBusy] = useState(false)
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)

  const link = useMemo(() => (store ? posLink(store.slug) : ''), [store])
  const removing = members.find((m) => m.user_id === removeUserId) || null

  async function onInvite(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await createInvite({ email, display_name: name, role })
      setName('')
      setEmail('')
      toast('Usuario de caja creado (invitación)')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo invitar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Equipo / POS</h1>
          <p className="page-sub">
            Comparte el link de caja e invita cajeros por correo.
          </p>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
          <Link2 size={18} /> Link de caja (compartible)
        </h3>
        <p className="page-sub">
          Ábrelo en otra pestaña o envíalo a quien va a cobrar. Debe iniciar sesión con un
          correo invitado.
        </p>
        <div className="toolbar">
          <input readOnly value={link} style={{ flex: 1, minWidth: 220, borderRadius: 12, border: '1px solid var(--line)', padding: '10px 12px' }} />
          <button
            className="btn btn-primary"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(link)
              toast('Link copiado')
            }}
          >
            <Copy size={16} />
            Copiar
          </button>
          <a className="btn btn-ghost" href={link} target="_blank" rel="noreferrer">
            Abrir
          </a>
        </div>
      </div>

      <div className="grid-2">
        <form className="panel panel-pad" onSubmit={onInvite}>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
            <UserPlus size={18} /> Invitar a la caja
          </h3>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ana Caja" />
          </div>
          <div className="field">
            <label>Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ana@correo.com"
            />
            <div className="field-hint">
              Esa persona crea cuenta (o inicia sesión) con este correo y queda unida al negocio.
            </div>
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}>
              <option value="staff">Cajero (solo POS)</option>
              <option value="admin">Admin (panel completo)</option>
            </select>
          </div>
          <button className="btn btn-primary" disabled={busy}>
            Crear acceso
          </button>
        </form>

        <div className="panel panel-pad">
          <h3 style={{ marginTop: 0, fontFamily: 'var(--display)', display: 'flex', gap: 8 }}>
            <Users size={18} /> Miembros
          </h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Rol</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.user_id}>
                    <td>
                      <strong>{m.display_name || '—'}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{m.email}</div>
                    </td>
                    <td>
                      <span className="badge badge-muted">{m.role}</span>
                    </td>
                    <td>
                      {m.user_id !== user?.id && m.role !== 'owner' ? (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => setRemoveUserId(m.user_id)}
                        >
                          <Trash2 size={14} />
                          Quitar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 style={{ marginTop: 18 }}>Invitaciones pendientes</h4>
          {!invites.filter((i) => !i.accepted_at).length ? (
            <div className="empty" style={{ padding: 12 }}>
              No hay invitaciones pendientes.
            </div>
          ) : (
            <ul>
              {invites
                .filter((i) => !i.accepted_at)
                .map((i) => (
                  <li key={i.id} style={{ marginBottom: 8 }}>
                    {i.display_name} · {i.email} · {i.role}{' '}
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => void deleteInvite(i.id).then(() => toast('Invitación borrada'))}
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmTypeModal
        open={Boolean(removing)}
        title="Quitar miembro"
        dangerText={`Vas a quitar a ${removing?.display_name || removing?.email || 'este usuario'} del negocio. Perderá acceso a la caja y al panel.`}
        confirmLabel="Quitar acceso"
        onClose={() => setRemoveUserId(null)}
        onConfirm={async () => {
          if (!removing) return
          await removeMember(removing.user_id)
          toast('Miembro quitado')
        }}
      />
    </div>
  )
}
