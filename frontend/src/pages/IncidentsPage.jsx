import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'

function Pill({ children }) {
  const text = String(children)
  return <span className={`pill ${text.toLowerCase().replace('_', '-')}`}>{text.replace('_', ' ')}</span>
}

const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function IncidentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [incidents, setIncidents] = useState([])
  const [assignees, setAssignees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [assigneeFilter, setAssigneeFilter] = useState(searchParams.get('assignedTo') || '')
  const [notice, setNotice] = useState({ msg: '', type: '' })
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.get('/users/assignees')
      .then(res => setAssignees(res.data))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      if (assigneeFilter) params.assignedTo = assigneeFilter
      const res = await api.get('/incidents', { params })
      setIncidents(res.data)
    } catch {
      setError('Could not load incidents. Check the backend connection.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, priorityFilter, assigneeFilter])

  useEffect(() => { load() }, [load])

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 4000)
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete incident INC-${String(id).padStart(4, '0')}? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await api.delete(`/incidents/${id}`)
      showNotice('Incident deleted successfully.', 'success')
      await load()
    } catch {
      showNotice('Failed to delete incident.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.patch(`/incidents/${id}/status`, { status })
      showNotice(`Status updated to ${status.replace('_', ' ')}.`, 'success')
      await load()
    } catch {
      showNotice('Failed to update status.', 'error')
    }
  }

  async function handleAssignChange(id, assignedTo) {
    try {
      await api.patch(`/incidents/${id}/assign`, { assignedTo: assignedTo || null })
      showNotice(assignedTo ? `Assigned to ${assignedTo}.` : 'Incident unassigned.', 'success')
      await load()
    } catch {
      showNotice('Failed to update assignee.', 'error')
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">INCIDENT MANAGEMENT</div>
          <h1>All Incidents</h1>
          <p>Triage, assign, filter, and track operations incidents in real time.</p>
        </div>
        <button className="primary-button" onClick={() => navigate('/incidents/new')}>
          ＋ Report Incident
        </button>
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

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Incident Queue</h2>
            <p>{incidents.length} record{incidents.length !== 1 ? 's' : ''} found</p>
          </div>
          <button className="secondary-button" onClick={load} disabled={loading}>
            ↻ Refresh
          </button>
        </div>

        <div className="toolbar toolbar-flex" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="search-box" style={{ flex: '1 1 240px' }}>
            <span>⌕</span>
            <input
              id="incident-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, description, category, assignee…"
            />
            {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
          </div>

          <select
            id="status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.slice(1).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>

          <select
            id="priority-filter"
            className="filter-select"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            id="assignee-filter"
            className="filter-select"
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            {assignees.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner" />
            <p>Loading incidents from backend…</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <strong>No incidents match your criteria</strong>
            <p>{search || statusFilter || priorityFilter || assigneeFilter ? 'Try clearing your filters.' : 'Report your first incident using the button above.'}</p>
            {(search || statusFilter || priorityFilter || assigneeFilter) && (
              <button
                className="secondary-button"
                style={{ marginTop: 10 }}
                onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setAssigneeFilter('') }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>INCIDENT</th>
                  <th>CATEGORY</th>
                  <th>PRIORITY</th>
                  <th>STATUS</th>
                  <th>ASSIGNEE</th>
                  <th>CREATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(i => (
                  <tr key={i.id}>
                    <td>
                      <div
                        className="incident-title clickable-title"
                        onClick={() => navigate(`/incidents/${i.id}`)}
                      >
                        INC-{String(i.id).padStart(4, '0')} · {i.title}
                      </div>
                      <div className="incident-desc">{i.description}</div>
                    </td>
                    <td><span className="category-badge">{i.category}</span></td>
                    <td><Pill>{i.priority}</Pill></td>
                    <td>
                      <select
                        className="status-select"
                        value={i.status}
                        onChange={e => handleStatusChange(i.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        {STATUSES.slice(1).map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="filter-select"
                        style={{ fontSize: 11, padding: '3px 8px', minWidth: 120 }}
                        value={i.assignedTo || ''}
                        onChange={e => handleAssignChange(i.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">Unassigned</option>
                        {assignees.map(u => (
                          <option key={u.id} value={u.name}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="action-btn"
                          onClick={() => navigate(`/incidents/${i.id}`)}
                          title="View details"
                        >
                          View
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => navigate(`/incidents/${i.id}?edit=1`)}
                          title="Edit incident"
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn danger-text"
                          onClick={() => handleDelete(i.id)}
                          disabled={deleting === i.id}
                          title="Delete incident"
                        >
                          {deleting === i.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
