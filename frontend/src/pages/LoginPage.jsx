import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const email = form.email.trim()
    if (!email || !form.password) {
      setError('Email and password are required.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await login(email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
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
          <h2>Welcome back</h2>
          <p>Sign in to your workspace</p>
        </div>

        {error && (
          <div className="alert error" role="alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            Email address
            <input
              id="login-email"
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
            Password
            <input
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>
          <button
            id="login-submit"
            className="primary-button submit-button"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/register" className="subtle-link">Create one →</Link>
        </p>
      </div>

      <div className="auth-graphic">
        <div className="auth-graphic-inner">
          <div className="auth-graphic-title">Operations at a glance</div>
          <div className="auth-graphic-cards">
            <div className="auth-preview-card">
              <span className="auth-preview-icon">◈</span>
              <div>
                <div className="auth-preview-label">Active Incidents</div>
                <div className="auth-preview-value">Real-time tracking</div>
              </div>
            </div>
            <div className="auth-preview-card">
              <span className="auth-preview-icon">⌘</span>
              <div>
                <div className="auth-preview-label">Knowledge Base</div>
                <div className="auth-preview-value">Team documentation</div>
              </div>
            </div>
            <div className="auth-preview-card">
              <span className="auth-preview-icon">✧</span>
              <div>
                <div className="auth-preview-label">AI Assistant</div>
                <div className="auth-preview-value">Intelligent support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
