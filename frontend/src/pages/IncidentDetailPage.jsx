import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

function Pill({ children }) {
  const text = String(children)
  return <span className={`pill ${text.toLowerCase().replace('_', '-')}`}>{text.replace('_', ' ')}</span>
}

const emptyForm = {
  title: '', description: '', category: 'SOFTWARE', priority: 'MEDIUM', status: 'OPEN', assignedTo: ''
}

const CATEGORIES = ['SOFTWARE', 'HARDWARE', 'NETWORK', 'ACCESS', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function IncidentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const startEditing = searchParams.get('edit') === '1'

  const [incident, setIncident] = useState(null)
  const [assignees, setAssignees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(startEditing)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ msg: '', type: '' })
  const [diagnosis, setDiagnosis] = useState(null)
  const [diagnosing, setDiagnosing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [incRes, assigneesRes] = await Promise.allSettled([
          api.get(`/incidents/${id}`),
          api.get('/users/assignees')
        ])

        if (!cancelled) {
          if (incRes.status === 'fulfilled') {
            setIncident(incRes.value.data)
            setForm({
              title: incRes.value.data.title,
              description: incRes.value.data.description,
              category: incRes.value.data.category,
              priority: incRes.value.data.priority,
              status: incRes.value.data.status,
              assignedTo: incRes.value.data.assignedTo || ''
            })
          } else {
            setError(incRes.reason?.response?.data?.error || 'Incident not found.')
          }

          if (assigneesRes.status === 'fulfilled') {
            setAssignees(assigneesRes.value.data)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Failed to load incident.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function updateField(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 4000)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) { showNotice('Title is required.', 'error'); return }
    if (!form.description.trim()) { showNotice('Description is required.', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo ? form.assignedTo : null
      }
      const res = await api.put(`/incidents/${id}`, payload)
      setIncident(res.data)
      setEditing(false)
      showNotice('Incident updated successfully.', 'success')
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to save changes.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign(name) {
    try {
      const res = await api.patch(`/incidents/${id}/assign`, { assignedTo: name || null })
      setIncident(res.data)
      setForm(f => ({ ...f, assignedTo: res.data.assignedTo || '' }))
      showNotice(name ? `Assigned to ${name}.` : 'Incident unassigned.', 'success')
    } catch {
      showNotice('Failed to update assignee.', 'error')
    }
  }

  async function handleStatusChange(s) {
    try {
      const res = await api.patch(`/incidents/${id}/status`, { status: s })
      setIncident(res.data)
      setForm(f => ({ ...f, status: res.data.status }))
      showNotice(`Status changed to ${s.replace('_', ' ')}.`, 'success')
    } catch {
      showNotice('Failed to update status.', 'error')
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete INC-${String(id).padStart(4, '0')}? This action cannot be undone.`)) return
    try {
      await api.delete(`/incidents/${id}`)
      navigate('/incidents', { replace: true })
    } catch {
      showNotice('Failed to delete incident.', 'error')
    }
  }

  async function handleRunDiagnosis() {
    setDiagnosing(true)
    try {
      const res = await api.post(`/ai/diagnose/${id}`)
      setDiagnosis(res.data.diagnosis)
      showNotice('AI diagnosis generated successfully.', 'success')
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to generate AI diagnosis.', 'error')
    } finally {
      setDiagnosing(false)
    }
  }

  async function handleSaveDiagnosisToKb() {
    if (!diagnosis) return
    try {
      await api.post('/kb', {
        title: `Runbook: INC-${String(incident.id).padStart(4, '0')} - ${incident.title}`,
        content: diagnosis,
        category: incident.category || 'GENERAL',
        status: 'PUBLISHED'
      })
      showNotice('Diagnosis saved to Knowledge Base as a new Runbook!', 'success')
    } catch {
      showNotice('Failed to save to Knowledge Base.', 'error')
    }
  }

  function handleCopyDiagnosis() {
    if (!diagnosis) return
    navigator.clipboard?.writeText(diagnosis)
    showNotice('Diagnosis copied to clipboard.', 'success')
  }

  if (loading) {
    return (
      <div>
        <section className="page-heading">
          <div><div className="eyebrow">INCIDENT DETAIL</div><h1>Loading…</h1></div>
        </section>
        <div className="empty-state"><div className="loading-spinner" /><p>Loading incident details…</p></div>
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div>
        <section className="page-heading">
          <div><div className="eyebrow">INCIDENT DETAIL</div><h1>Incident Not Found</h1></div>
          <button className="secondary-button" onClick={() => navigate('/incidents')}>← Back to Incidents</button>
        </section>
        <div className="alert error"><span>⚠ {error || 'The requested incident could not be found.'}</span></div>
      </div>
    )
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">INCIDENT DETAIL</div>
          <h1>INC-{String(incident.id).padStart(4, '0')} · {incident.title}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <Pill>{incident.priority}</Pill>
            <Pill>{incident.status}</Pill>
            <span className="category-badge">{incident.category}</span>
            <span style={{ color: '#8a94a5', fontSize: 11 }}>
              Assigned to: <strong>{incident.assignedTo || 'Unassigned'}</strong>
            </span>
            <span style={{ color: '#8a94a5', fontSize: 11 }}>
              · Created {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '—'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-button" onClick={() => navigate('/incidents')}>← Back</button>
          {!editing && (
            <button className="primary-button" onClick={() => setEditing(true)}>✏ Edit</button>
          )}
          <button className="danger-button" onClick={handleDelete}>🗑 Delete</button>
        </div>
      </section>

      {notice.msg && (
        <div className={`alert${notice.type === 'error' ? ' error' : ''}`} style={{ marginBottom: 16 }}>
          <span>{notice.msg}</span>
          <button onClick={() => setNotice({ msg: '', type: '' })}>✕</button>
        </div>
      )}

      {editing ? (
        <div className="panel form-panel">
          <div className="panel-heading">
            <div><h2>Edit Incident</h2><p>Update incident details, priority, and assignment</p></div>
            <span className="form-icon">✏</span>
          </div>
          <form onSubmit={handleSave}>
            <label>
              Incident Title
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. VPN connection failing"
                maxLength={150}
                required
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Describe what happened, system impact, and diagnostic logs…"
                rows={5}
                required
              />
            </label>
            <div className="two-col">
              <label>
                Category
                <select name="category" value={form.category} onChange={updateField}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </label>

              <label>
                Assignee
                <select name="assignedTo" value={form.assignedTo} onChange={updateField}>
                  <option value="">— Unassigned —</option>
                  {assignees.map(u => (
                    <option key={u.id} value={u.name}>
                      👤 {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two-col">
              <label>
                Priority
                <select name="priority" value={form.priority} onChange={updateField}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={updateField}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button className="primary-button submit-button" disabled={saving} style={{ flex: 1 }}>
                {saving ? <><span className="spinner" /> Saving Changes…</> : 'Save Changes'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setEditing(false)
                  setForm({
                    title: incident.title,
                    description: incident.description,
                    category: incident.category,
                    priority: incident.priority,
                    status: incident.status,
                    assignedTo: incident.assignedTo || ''
                  })
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="content-grid">
          <div className="panel">
            <div className="panel-heading">
              <div><h2>Incident Details</h2><p>Full incident metadata and timeline</p></div>
            </div>
            <div className="detail-section">
              <div className="detail-row">
                <span className="detail-label">Title</span>
                <span className="detail-value">{incident.title}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value detail-desc">{incident.description}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value"><span className="category-badge">{incident.category}</span></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Priority</span>
                <span className="detail-value"><Pill>{incident.priority}</Pill></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value"><Pill>{incident.status}</Pill></span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Assignee</span>
                <span className="detail-value">
                  {incident.assignedTo ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <span className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: 10 }}>
                        {incident.assignedTo[0].toUpperCase()}
                      </span>
                      {incident.assignedTo}
                    </span>
                  ) : (
                    <span style={{ color: '#8fa3c8', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created At</span>
                <span className="detail-value">{incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Updated</span>
                <span className="detail-value">{incident.updatedAt ? new Date(incident.updatedAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            {/* AI Diagnosis Panel (when generated) */}
            {diagnosis && (
              <div className="ai-triage-panel" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>✧ AI Incident Triage & Resolution Analysis</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="ai-action-btn" onClick={handleCopyDiagnosis}>📋 Copy</button>
                    <button className="ai-action-btn" onClick={handleSaveDiagnosisToKb}>💾 Save as KB Runbook</button>
                    <button className="ai-action-btn" onClick={() => setDiagnosis(null)}>✕</button>
                  </div>
                </div>
                <div className="ai-triage-content">
                  {diagnosis}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* AI Assistant Triage Card */}
            <div className="panel" style={{ border: '1px solid #c7d2fe', background: 'linear-gradient(180deg, #f5f7ff 0%, #ffffff 100%)' }}>
              <div className="panel-heading">
                <div>
                  <h2 style={{ color: 'var(--brand-blue)' }}>✧ NexusOps AI Triage</h2>
                  <p>Incident diagnostics & runbook generation</p>
                </div>
              </div>
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: '#526079', lineHeight: 1.5 }}>
                  Analyze symptoms, correlate error logs against your Knowledge Base, and synthesize CLI commands.
                </p>
                <button
                  className="primary-button"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleRunDiagnosis}
                  disabled={diagnosing}
                >
                  {diagnosing ? <><span className="spinner" /> Analyzing Incident…</> : '⚡ Run AI Diagnosis'}
                </button>
                <button
                  className="secondary-button"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => navigate('/ai-assistant')}
                >
                  💬 Open AI Assistant Console
                </button>
              </div>
            </div>

            {/* Quick Assign Panel */}
            <div className="panel">
              <div className="panel-heading">
                <div><h2>Assignee</h2><p>Dispatch incident to an engineer</p></div>
              </div>
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {user?.name && incident.assignedTo !== user.name && (
                  <button
                    className="secondary-button"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleAssign(user.name)}
                  >
                    🙋 Assign to Me ({user.name})
                  </button>
                )}
                <div>
                  <label className="form-label" style={{ marginBottom: 6 }}>Reassign to Team Member:</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={incident.assignedTo || ''}
                    onChange={e => handleAssign(e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {assignees.map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Status Panel */}
            <div className="panel">
              <div className="panel-heading">
                <div><h2>Status Lifecycle</h2><p>Transition workflow state</p></div>
              </div>
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                  <button
                    key={s}
                    className={`status-action-btn${incident.status === s ? ' active' : ''}`}
                    onClick={() => handleStatusChange(s)}
                  >
                    {s === incident.status ? '✓ ' : ''}{s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
