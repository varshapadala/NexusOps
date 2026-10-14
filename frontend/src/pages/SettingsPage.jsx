import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

const DEFAULT_SETTINGS = {
  workspaceName: 'NexusOps Workspace',
  defaultPriority: 'MEDIUM',
  autoRefreshSeconds: 30,
  notificationsEnabled: true,
  incidentPrefix: 'INC'
}

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [apiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8080/api')

  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ msg: '', type: '' })
  const [aiStatus, setAiStatus] = useState({ configured: false, provider: 'none', model: 'none' })
  const [pingResult, setPingResult] = useState(null)
  const [pinging, setPinging] = useState(false)

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 5000)
  }

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      try {
        const [settingsRes, aiRes] = await Promise.allSettled([
          api.get('/settings'),
          api.get('/ai/status')
        ])
        if (!cancelled) {
          if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
            setSettings({
              workspaceName: settingsRes.value.data.workspaceName || DEFAULT_SETTINGS.workspaceName,
              defaultPriority: settingsRes.value.data.defaultPriority || DEFAULT_SETTINGS.defaultPriority,
              autoRefreshSeconds: Number(settingsRes.value.data.autoRefreshSeconds) || DEFAULT_SETTINGS.autoRefreshSeconds,
              notificationsEnabled: Boolean(settingsRes.value.data.notificationsEnabled),
              incidentPrefix: settingsRes.value.data.incidentPrefix || DEFAULT_SETTINGS.incidentPrefix
            })
          }
          if (aiRes.status === 'fulfilled' && aiRes.value.data) {
            setAiStatus(aiRes.value.data)
          }
        }
      } catch {
        if (!cancelled) showNotice('Could not load current settings from backend.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/settings', settings)
      setSettings({
        workspaceName: res.data.workspaceName,
        defaultPriority: res.data.defaultPriority,
        autoRefreshSeconds: Number(res.data.autoRefreshSeconds),
        notificationsEnabled: Boolean(res.data.notificationsEnabled),
        incidentPrefix: res.data.incidentPrefix
      })
      showNotice('Settings saved successfully to database.', 'success')
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function testApiHealth() {
    setPinging(true)
    const start = performance.now()
    try {
      const res = await api.get('/health')
      const latency = Math.round(performance.now() - start)
      setPingResult({ success: true, latency, data: res.data })
    } catch (err) {
      setPingResult({ success: false, error: err.message })
    } finally {
      setPinging(false)
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">CONFIGURATION</div>
          <h1>Workspace Settings</h1>
          <p>Application preferences, system parameters, and backend integrations.</p>
        </div>
      </section>

      {notice.msg && (
        <div className={`alert${notice.type === 'error' ? ' error' : ''}`} style={{ marginBottom: 16 }}>
          <span>{notice.msg}</span>
          <button onClick={() => setNotice({ msg: '', type: '' })}>✕</button>
        </div>
      )}

      <div className="content-grid">
        {/* Left Column: Editable Settings Form */}
        <div className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>General Preferences</h2>
              <p>Configure workspace defaults and operations behavior</p>
            </div>
            <span className="form-icon">⚙</span>
          </div>

          <form onSubmit={handleSaveSettings} style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="form-label">
              Workspace Name
              <input
                value={settings.workspaceName}
                onChange={e => setSettings(s => ({ ...s, workspaceName: e.target.value }))}
                placeholder="e.g. NexusOps IT Operations"
                required
                disabled={loading || saving}
              />
            </label>

            <div className="two-col">
              <label className="form-label">
                Default Incident Priority
                <select
                  value={settings.defaultPriority}
                  onChange={e => setSettings(s => ({ ...s, defaultPriority: e.target.value }))}
                  disabled={loading || saving}
                >
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="CRITICAL">🔴 Critical</option>
                </select>
              </label>

              <label className="form-label">
                Incident Code Prefix
                <input
                  value={settings.incidentPrefix}
                  onChange={e => setSettings(s => ({ ...s, incidentPrefix: e.target.value.toUpperCase() }))}
                  placeholder="e.g. INC"
                  maxLength={6}
                  required
                  disabled={loading || saving}
                />
              </label>
            </div>

            <label className="form-label">
              Dashboard Auto-Refresh Interval
              <select
                value={settings.autoRefreshSeconds}
                onChange={e => setSettings(s => ({ ...s, autoRefreshSeconds: Number(e.target.value) }))}
                disabled={loading || saving}
              >
                <option value={0}>Manual refresh only (Off)</option>
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds (Default)</option>
                <option value={60}>Every 60 seconds</option>
              </select>
            </label>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #eef2f6', marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0, fontWeight: 500, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={e => setSettings(s => ({ ...s, notificationsEnabled: e.target.checked }))}
                  disabled={loading || saving}
                  style={{ width: 16, height: 16, accentColor: 'var(--brand-blue)' }}
                />
                <span>Enable high-priority incident notifications & alerts</span>
              </label>
              <small style={{ color: '#8fa3c8', display: 'block', marginLeft: 26, marginTop: 4 }}>
                Send automated in-app alerts when Critical or High priority incidents are logged.
              </small>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button
                type="submit"
                className="primary-button submit-button"
                disabled={loading || saving}
                style={{ flex: 1 }}
              >
                {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Settings'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                disabled={loading || saving}
              >
                Reset Defaults
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: System Diagnostics, AI Status & Quick Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Provider Status Panel */}
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>AI Assistant Status</h2>
                <p>Live status reported from backend</p>
              </div>
              <div className="ai-status-badge">
                <span className={`status-dot ${aiStatus.configured ? '' : 'dot-warning'}`} />
                {aiStatus.configured ? 'Active' : 'Unconfigured'}
              </div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`pill ${aiStatus.configured ? 'resolved' : 'closed'}`}>
                      {aiStatus.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
                    </span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Configured Provider</span>
                  <span className="detail-value">{aiStatus.provider || 'None'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Model Target</span>
                  <span className="detail-value">{aiStatus.model || 'None'}</span>
                </div>
              </div>
              {!aiStatus.configured && (
                <div className="alert" style={{ marginTop: 12, marginBottom: 0, fontSize: 11 }}>
                  <span>
                    To activate AI responses, specify <code>nexusops.ai.provider</code> and <code>nexusops.ai.api-key</code> in the Spring Boot <code>application.properties</code>.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* System Diagnostic & Health Panel */}
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>System Diagnostics</h2>
                <p>Environment connectivity verification</p>
              </div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div className="detail-section">
                <div className="detail-row">
                  <span className="detail-label">Backend URL</span>
                  <span className="detail-value"><code style={{ fontSize: 11, background: '#f5f7fa', padding: '2px 6px', borderRadius: 4 }}>{apiUrl}</code></span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Current Role</span>
                  <span className="detail-value">
                    <span className={`role-badge role-${user?.role?.toLowerCase()}`}>{user?.role}</span>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Auth Method</span>
                  <span className="detail-value">JWT Bearer (HMAC-SHA256)</span>
                </div>
              </div>

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <strong style={{ fontSize: 12 }}>API Health Latency Check</strong>
                  <button
                    className="secondary-button"
                    onClick={testApiHealth}
                    disabled={pinging}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    {pinging ? 'Pinging…' : '⚡ Test Connection'}
                  </button>
                </div>
                {pingResult && (
                  <div className={`alert ${pingResult.success ? '' : 'error'}`} style={{ marginBottom: 0, fontSize: 11 }}>
                    {pingResult.success ? (
                      <span>🟢 Connection healthy! Ping: <strong>{pingResult.latency} ms</strong> · Server Status: <code>{pingResult.data?.status}</code></span>
                    ) : (
                      <span>🔴 Connection failed: {pingResult.error}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fast Workspace Shortcuts */}
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Workspace Shortcuts</h2>
                <p>Jump to operational modules</p>
              </div>
            </div>
            <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="settings-link" onClick={() => navigate('/incidents')}>
                <span>◈</span>
                <span>Incident Queue</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8fa3c8' }}>Manage →</span>
              </button>
              <button className="settings-link" onClick={() => navigate('/knowledge-base')}>
                <span>⌘</span>
                <span>Knowledge Base</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8fa3c8' }}>Articles →</span>
              </button>
              <button className="settings-link" onClick={() => navigate('/ai-assistant')}>
                <span>✧</span>
                <span>AI Assistant Console</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8fa3c8' }}>Ask AI →</span>
              </button>
              {isAdmin && (
                <button className="settings-link" onClick={() => navigate('/users')}>
                  <span>👥</span>
                  <span>User Administration</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8fa3c8' }}>Admin →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
