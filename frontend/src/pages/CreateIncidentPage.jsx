import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const emptyForm = {
  title: '', description: '', category: 'SOFTWARE', priority: 'MEDIUM', status: 'OPEN', assignedTo: ''
}

const CATEGORIES = ['SOFTWARE', 'HARDWARE', 'NETWORK', 'ACCESS', 'OTHER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function CreateIncidentPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [assignees, setAssignees] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users/assignees')
      .then(res => setAssignees(res.data))
      .catch(() => {})
  }, [])

  function update(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required.'
    if (form.title.trim().length > 150) return 'Title must be 150 characters or fewer.'
    if (!form.description.trim()) return 'Description is required.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo ? form.assignedTo : null
      }
      const res = await api.post('/incidents', payload)
      navigate(`/incidents/${res.data.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create incident. Check the backend connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">INCIDENT MANAGEMENT</div>
          <h1>Report Incident</h1>
          <p>Provide details so the IT operations team can triage, assign, and resolve quickly.</p>
        </div>
        <button className="secondary-button" onClick={() => navigate('/incidents')}>← Back</button>
      </section>

      {error && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="panel form-panel" style={{ maxWidth: 760 }}>
        <div className="panel-heading">
          <div><h2>New Incident Report</h2><p>Fields marked with * are required</p></div>
          <span className="form-icon">＋</span>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Incident Title *
            <input
              id="incident-title"
              name="title"
              value={form.title}
              onChange={update}
              placeholder="e.g. WireGuard VPN gateway timeout in EU cluster"
              maxLength={150}
              required
            />
            <small style={{ color: '#8fa3c8', marginTop: 3 }}>{form.title.length}/150 characters</small>
          </label>

          <label>
            Description *
            <textarea
              id="incident-description"
              name="description"
              value={form.description}
              onChange={update}
              placeholder="Detail what occurred, error codes, systems affected, user impact, and steps to reproduce…"
              rows={5}
              required
            />
          </label>

          <div className="two-col">
            <label>
              Category
              <select id="incident-category" name="category" value={form.category} onChange={update}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c === 'SOFTWARE' ? '💻 Software' :
                     c === 'HARDWARE' ? '🖥 Hardware' :
                     c === 'NETWORK' ? '🌐 Network' :
                     c === 'ACCESS' ? '🔐 Access / Login' : '📋 Other'}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Assignee
              <select id="incident-assignee" name="assignedTo" value={form.assignedTo} onChange={update}>
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
              <select id="incident-priority" name="priority" value={form.priority} onChange={update}>
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p === 'CRITICAL' ? '🔴 Critical' :
                     p === 'HIGH' ? '🟠 High' :
                     p === 'MEDIUM' ? '🟡 Medium' : '🟢 Low'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Initial Status
              <select id="incident-status" name="status" value={form.status} onChange={update}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              id="create-incident-submit"
              className="primary-button submit-button"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? <><span className="spinner" /> Creating Incident…</> : '＋ Create Incident'}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/incidents')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
