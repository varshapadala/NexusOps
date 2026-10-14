import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

const emptyNewUser = {
  name: '',
  email: '',
  password: '',
  role: 'USER',
  active: true
}

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState({ msg: '', type: '' })
  const [deleting, setDeleting] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', role: 'USER', active: true })

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState(emptyNewUser)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load users. You may not have administrative privileges.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 4500)
  }

  function startEdit(user) {
    setEditingId(user.id)
    setEditForm({ name: user.name, role: user.role, active: user.active })
  }

  async function handleSaveEdit(id) {
    try {
      await api.put(`/users/${id}`, editForm)
      showNotice('User account updated successfully.')
      setEditingId(null)
      await load()
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to update user.', 'error')
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
      showNotice('All fields are required.', 'error')
      return
    }
    if (newUser.password.length < 6) {
      showNotice('Password must be at least 6 characters.', 'error')
      return
    }

    setCreating(true)
    try {
      await api.post('/users', newUser)
      showNotice(`User ${newUser.name} created successfully.`)
      setShowAddModal(false)
      setNewUser(emptyNewUser)
      await load()
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to create user account.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(u) {
    if (u.id === currentUser?.id || u.email === currentUser?.email) {
      showNotice('You cannot delete your own active administrator account.', 'error')
      return
    }
    if (!window.confirm(`Delete user "${u.name}" (${u.email})? This action cannot be undone.`)) return
    setDeleting(u.id)
    try {
      await api.delete(`/users/${u.id}`)
      showNotice(`User ${u.name} deleted successfully.`)
      await load()
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to delete user.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  async function handleRoleChange(u, targetRole) {
    if ((u.id === currentUser?.id || u.email === currentUser?.email) && targetRole === 'USER') {
      showNotice('You cannot remove administrator privileges from your own account.', 'error')
      return
    }
    try {
      await api.patch(`/users/${u.id}/role`, { role: targetRole })
      showNotice(`Role updated to ${targetRole} for ${u.name}.`)
      await load()
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to update role.', 'error')
    }
  }

  // Non-Admin: Role-Based Authorization Access Denied Card
  if (!isAdmin) {
    return (
      <div>
        <section className="page-heading">
          <div>
            <div className="eyebrow">ADMINISTRATION</div>
            <h1>User Management</h1>
            <p>Team members, roles, and access authorization.</p>
          </div>
        </section>

        <div className="panel" style={{ maxWidth: 580, margin: '30px auto', padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
          <h2 style={{ marginBottom: 10 }}>Administrator Access Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            The User Management console is restricted to users with the <strong>ADMIN</strong> role.
            Your current account (<code>{currentUser?.email}</code>) has the role <strong>{currentUser?.role || 'USER'}</strong>.
            Please contact an administrator if you need elevated workspace privileges.
          </p>
          <button className="primary-button" onClick={() => navigate('/')}>
            ← Return to Operations Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATION</div>
          <h1>User Management</h1>
          <p>Manage team members, roles, credential status, and access permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="primary-button" onClick={() => setShowAddModal(true)}>
            ＋ Add Team Member
          </button>
        </div>
      </section>

      {notice.msg && (
        <div className={`alert${notice.type === 'error' ? ' error' : ''}`}>
          <span>{notice.msg}</span>
          <button onClick={() => setNotice({ msg: '', type: '' })}>✕</button>
        </div>
      )}

      {error && (
        <div className="alert error">
          <span>⚠ {error}</span>
          <button onClick={load}>Retry</button>
        </div>
      )}

      {/* Add User Modal / Inline Form */}
      {showAddModal && (
        <div className="panel form-panel" style={{ marginBottom: 20 }}>
          <div className="panel-heading">
            <div>
              <h2>Add New Team Member</h2>
              <p>Create an account with initial login credentials</p>
            </div>
            <button className="cancel-button" onClick={() => setShowAddModal(false)}>✕ Cancel</button>
          </div>
          <form onSubmit={handleCreateUser}>
            <div className="two-col">
              <label>
                Full Name *
                <input
                  value={newUser.name}
                  onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                  placeholder="e.g. Alex Chen"
                  required
                />
              </label>
              <label>
                Email Address *
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  placeholder="alex.chen@nexusops.com"
                  required
                />
              </label>
            </div>

            <div className="two-col">
              <label>
                Temporary Password *
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  required
                />
              </label>
              <label>
                Role
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                >
                  <option value="USER">USER (Standard Member)</option>
                  <option value="DEVOPS_ENGINEER">DEVOPS_ENGINEER (Operations Engineer)</option>
                  <option value="ADMIN">ADMIN (Full Workspace Administrator)</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button className="primary-button submit-button" disabled={creating} style={{ flex: 1 }}>
                {creating ? <><span className="spinner" /> Creating…</> : '＋ Create Member'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Team Directory</h2>
            <p>{users.length} registered workspace member{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="secondary-button" onClick={load} disabled={loading}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state"><div className="loading-spinner" /><p>Loading team members…</p></div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <strong>No team members found</strong>
            <p>Click "Add Team Member" above to register new users.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser?.id || u.email === currentUser?.email
                  return (
                    <tr key={u.id}>
                      <td>
                        {editingId === u.id ? (
                          <input
                            value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="inline-edit-input"
                          />
                        ) : (
                          <div className="user-name-cell">
                            <div className="avatar avatar-sm">
                              {u.name ? u.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                            </div>
                            <div>
                              <span className="incident-title" style={{ maxWidth: 'none' }}>{u.name}</span>
                              {isSelf && <small style={{ color: 'var(--brand-blue)', display: 'block', fontSize: 10 }}>(You)</small>}
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#6f7a8e' }}>{u.email}</td>
                      <td>
                        {editingId === u.id ? (
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                            className="filter-select"
                            style={{ minWidth: 80 }}
                            disabled={isSelf}
                          >
                            <option value="USER">USER</option>
                            <option value="DEVOPS_ENGINEER">DEVOPS_ENGINEER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                        )}
                      </td>
                      <td>
                        {editingId === u.id ? (
                          <select
                            value={editForm.active ? 'true' : 'false'}
                            onChange={e => setEditForm(f => ({ ...f, active: e.target.value === 'true' }))}
                            className="filter-select"
                            disabled={isSelf}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        ) : (
                          <span className={`pill ${u.active ? 'resolved' : 'closed'}`}>
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: '#8a94a5' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {editingId === u.id ? (
                          <div className="actions">
                            <button className="action-btn" onClick={() => handleSaveEdit(u.id)}>Save</button>
                            <button className="action-btn" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="actions">
                            <button className="action-btn" onClick={() => startEdit(u)} title="Edit user">
                              Edit
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleRoleChange(u, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot demote yourself' : u.role === 'ADMIN' ? 'Demote to USER' : 'Promote to ADMIN'}
                            >
                              {u.role === 'ADMIN' ? '→ User' : '→ Admin'}
                            </button>
                            <button
                              className="action-btn danger-text"
                              onClick={() => handleDelete(u)}
                              disabled={deleting === u.id || isSelf}
                              title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                            >
                              {deleting === u.id ? '…' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
