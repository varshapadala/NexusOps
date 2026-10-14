import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const name = form.name.trim()
    const email = form.email.trim()
    if (!name) { setError('Full name is required.'); return }
    if (!email) { setError('Email address is required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await register(name, email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark brand-mark-lg">N</div>
          <div>
            <h1 className="auth-title">NexusOps</h1>
            <p className="auth-subtitle">Intelligent IT Operations Platform</p>
          </div>
        </div>

        <div className="auth-form-header">
          <h2>Create your account</h2>
          <p>Join your IT operations workspace</p>
        </div>

        {error && (
          <div className="alert error" role="alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            Full name
            <input
              id="reg-name"
              name="name"
              type="text"
              value={form.name}
              onChange={update}
              placeholder="Jane Smith"
              autoComplete="name"
              required
            />
          </label>
          <label>
            Email address
            <input
              id="reg-email"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password <small style={{ color: '#8fa3c8', fontWeight: 400 }}>(min 6 characters)</small>
            <input
              id="reg-password"
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm password
            <input
              id="reg-confirm"
              name="confirm"
              type="password"
              value={form.confirm}
              onChange={update}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </label>
          <button
            id="reg-submit"
            className="primary-button submit-button"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="subtle-link">Sign in →</Link>
        </p>
        <p className="auth-note">
          ℹ The first registered user automatically gets Admin privileges.
        </p>
      </div>

      <div className="auth-graphic">
        <div className="auth-graphic-inner">
          <div className="auth-graphic-title">Everything your IT team needs</div>
          <div className="auth-graphic-cards">
            <div className="auth-preview-card">
              <span className="auth-preview-icon">🔐</span>
              <div>
                <div className="auth-preview-label">Secure by default</div>
                <div className="auth-preview-value">JWT + BCrypt auth</div>
              </div>
            </div>
            <div className="auth-preview-card">
              <span className="auth-preview-icon">👥</span>
              <div>
                <div className="auth-preview-label">Role-based access</div>
                <div className="auth-preview-value">Admin & User roles</div>
              </div>
            </div>
            <div className="auth-preview-card">
              <span className="auth-preview-icon">📊</span>
              <div>
                <div className="auth-preview-label">Live dashboard</div>
                <div className="auth-preview-value">Real-time metrics</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
