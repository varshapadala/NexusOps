import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function StatCard({ label, value, hint, icon, color, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? `Filter by ${label}` : undefined}
    >
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon" style={color ? { background: color + '18', color } : {}}>
          {icon}
        </span>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  )
}

function Pill({ children }) {
  return <span className={`pill ${String(children).toLowerCase().replace('_', '-')}`}>{children}</span>
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshInterval, setRefreshInterval] = useState(30)

  const loadData = useCallback(async () => {
    try {
      const [sumRes, incRes, settingsRes] = await Promise.allSettled([
        api.get('/incidents/summary'),
        api.get('/incidents', { params: {} }),
        api.get('/settings')
      ])

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
      if (incRes.status === 'fulfilled') setRecent(incRes.value.data.slice(0, 6))
      if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.autoRefreshSeconds) {
        setRefreshInterval(Number(settingsRes.value.data.autoRefreshSeconds))
      }
      setError('')
    } catch {
      setError('Could not load dashboard data. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Optional auto-refresh interval based on workspace settings
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return
    const timer = setInterval(() => {
      loadData()
    }, refreshInterval * 1000)
    return () => clearInterval(timer)
  }, [refreshInterval, loadData])

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS CENTER</div>
          <h1>Overview Dashboard</h1>
          <p>Monitor, triage, and resolve your IT operations issues in real time.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={loadData} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="primary-button" onClick={() => navigate('/incidents/new')}>
            ＋ Report Incident
          </button>
        </div>
      </section>

      {error && (
        <div className="alert error">
          <span>⚠ {error}</span>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      <section className="stat-grid">
        <StatCard
          label="Total Incidents"
          value={summary?.total}
          hint="All time logged"
          icon="▤"
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          label="Open"
          value={summary?.open}
          hint="Awaiting triage / action"
          icon="◷"
          color="#f59e0b"
          onClick={() => navigate('/incidents?status=OPEN')}
        />
        <StatCard
          label="In Progress"
          value={summary?.inProgress}
          hint="Active investigation"
          icon="↗"
          color="#536be4"
          onClick={() => navigate('/incidents?status=IN_PROGRESS')}
        />
        <StatCard
          label="Critical"
          value={summary?.critical}
          hint="Immediate attention"
          icon="⚑"
          color="#ef4444"
          onClick={() => navigate('/incidents?priority=CRITICAL')}
        />
      </section>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Incidents</h2>
              <p>Latest active operations tickets</p>
            </div>
            <button className="secondary-button" onClick={() => navigate('/incidents')}>
              View all →
            </button>
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <p>Loading incidents from database…</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <strong>No incidents logged</strong>
              <p>Create your first incident to begin monitoring.</p>
              <button className="primary-button" style={{ marginTop: 12 }} onClick={() => navigate('/incidents/new')}>
                Report Incident
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>INCIDENT</th>
                    <th>PRIORITY</th>
                    <th>STATUS</th>
                    <th>ASSIGNEE</th>
                    <th>CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(i => (
                    <tr
                      key={i.id}
                      className="table-row-clickable"
                      onClick={() => navigate(`/incidents/${i.id}`)}
                    >
                      <td>
                        <div className="incident-title">INC-{String(i.id).padStart(4, '0')} · {i.title}</div>
                        <div className="incident-desc">{i.category}</div>
                      </td>
                      <td><Pill>{i.priority}</Pill></td>
                      <td><Pill>{i.status.replace('_', ' ')}</Pill></td>
                      <td>
                        <span style={{ fontSize: 11, color: i.assignedTo ? '#172033' : '#8fa3c8' }}>
                          {i.assignedTo ? `👤 ${i.assignedTo}` : 'Unassigned'}
                        </span>
                      </td>
                      <td>{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Status Breakdown</h2>
              <p>Distribution across lifecycle</p>
            </div>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            {summary ? (
              <div className="summary-list">
                {[
                  { label: 'Open', val: summary.open, color: '#f59e0b', filter: '/incidents?status=OPEN' },
                  { label: 'In Progress', val: summary.inProgress, color: '#536be4', filter: '/incidents?status=IN_PROGRESS' },
                  { label: 'Resolved', val: summary.resolved, color: '#10b981', filter: '/incidents?status=RESOLVED' },
                  { label: 'Closed', val: summary.closed, color: '#6b7280', filter: '/incidents?status=CLOSED' },
                  { label: 'High Priority', val: summary.high, color: '#f97316', filter: '/incidents?priority=HIGH' },
                  { label: 'Critical Priority', val: summary.critical, color: '#ef4444', filter: '/incidents?priority=CRITICAL' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="summary-row"
                    onClick={() => navigate(item.filter)}
                    style={{ cursor: 'pointer' }}
                    title={`View ${item.label} incidents`}
                  >
                    <span className="summary-label">{item.label}</span>
                    <div className="summary-bar-wrap">
                      <div
                        className="summary-bar"
                        style={{
                          width: summary.total > 0 ? `${(item.val / summary.total) * 100}%` : '0%',
                          background: item.color
                        }}
                      />
                    </div>
                    <span className="summary-count" style={{ color: item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                {loading ? <div className="loading-spinner" /> : <span>No data</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
