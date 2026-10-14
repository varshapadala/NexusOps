import { useState } from 'react'
import { useAuth } from '../AuthContext'
import api from '../api'

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ msg: '', type: '' })

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U'

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 5000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { showNotice('Name is required.', 'error'); return }
    if (form.newPassword) {
      if (!form.currentPassword) {
        showNotice('Current password is required to change password.', 'error')
        return
      }
      if (form.newPassword.length < 6) {
        showNotice('New password must be at least 6 characters.', 'error')
        return
      }
      if (form.newPassword !== form.confirmPassword) {
        showNotice('New passwords do not match.', 'error')
        return
      }
    }

    setSaving(true)
    try {
      const payload = { name: form.name.trim() }
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword
        payload.newPassword = form.newPassword
      }
      const res = await api.put('/auth/profile', payload)
      const { token, userId, ...rest } = res.data
      const userData = { ...rest, id: userId }
      if (updateUser) {
        updateUser(userData, token)
      }
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '', name: userData.name }))
      showNotice('Profile updated successfully.', 'success')
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to update profile. Check current password.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1>My Profile</h1>
          <p>View and update your account information.</p>
        </div>
      </section>

      {notice.msg && (
        <div className={`alert${notice.type === 'error' ? ' error' : ''}`}>
          <span>{notice.msg}</span>
          <button onClick={() => setNotice({ msg: '', type: '' })}>✕</button>
        </div>
      )}

      <div className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div><h2>Profile Information</h2><p>Your account details</p></div>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            <div className="profile-avatar-section">
              <div className="avatar avatar-lg">{initials}</div>
              <div>
                <div className="profile-name">{user?.name}</div>
                <div className="profile-email">{user?.email}</div>
                <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
              </div>
            </div>
          </div>
          <form onSubmit={handleSave} style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="form-label">
              Full name
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
              />
            </label>
            <label className="form-label">
              Email address
              <input value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </label>
            <div style={{ borderTop: '1px solid #eef0f5', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#48536a', marginBottom: 10 }}>Change Password</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label className="form-label">
                  New password
                  <input
                    type="password"
                    value={form.newPassword}
                    onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Leave blank to keep current"
                  />
                </label>
                <label className="form-label">
                  Confirm new password
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                </label>
              </div>
            </div>
            <button className="primary-button submit-button" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
            </button>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-heading">
              <div><h2>Account Info</h2></div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">User ID</span>
                  <span className="detail-value">#{user?.userId || user?.id}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">
                    <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div><h2>Session</h2></div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <p style={{ fontSize: 12, color: '#8fa3c8', marginBottom: 12 }}>
                You are currently logged in. Your session token is stored locally and expires after 24 hours.
              </p>
              <button
                className="danger-button"
                onClick={() => {
                  if (window.confirm('Sign out of NexusOps?')) logout()
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
