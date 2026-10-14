import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../AuthContext'

export default function KnowledgeBasePage() {
  const { user, isAdmin } = useAuth()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [notice, setNotice] = useState({ msg: '', type: '' })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'GENERAL', status: 'PUBLISHED' })

  const CATEGORIES = ['GENERAL', 'SOFTWARE', 'HARDWARE', 'NETWORK', 'SECURITY', 'PROCESS']

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (search) params.search = search
      const res = await api.get('/kb', { params })
      let filtered = res.data
      if (categoryFilter) {
        filtered = filtered.filter(a => a.category?.toUpperCase() === categoryFilter.toUpperCase())
      }
      setArticles(filtered)
    } catch {
      setError('Could not load knowledge base articles. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => { load() }, [load])

  function showNotice(msg, type = 'success') {
    setNotice({ msg, type })
    setTimeout(() => setNotice({ msg: '', type: '' }), 4000)
  }

  function startNew() {
    setEditing(null)
    setForm({ title: '', content: '', category: 'GENERAL', status: 'PUBLISHED' })
    setShowForm(true)
    setSelected(null)
  }

  function startEdit(article) {
    setEditing(article.id)
    setForm({
      title: article.title,
      content: article.content,
      category: article.category || 'GENERAL',
      status: article.status || 'PUBLISHED'
    })
    setShowForm(true)
    setSelected(null)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) { showNotice('Title is required.', 'error'); return }
    if (!form.content.trim()) { showNotice('Content is required.', 'error'); return }
    setSaving(true)
    try {
      if (editing) {
        const res = await api.put(`/kb/${editing}`, form)
        showNotice('Article updated successfully.')
        if (selected?.id === editing) setSelected(res.data)
      } else {
        const res = await api.post('/kb', form)
        showNotice('Article published successfully.')
        setSelected(res.data)
      }
      setShowForm(false)
      setEditing(null)
      await load()
    } catch (err) {
      showNotice(err.response?.data?.error || 'Failed to save article.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this knowledge base article? This cannot be undone.')) return
    try {
      await api.delete(`/kb/${id}`)
      showNotice('Article deleted successfully.')
      if (selected?.id === id) setSelected(null)
      await load()
    } catch {
      showNotice('Failed to delete article.', 'error')
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">KNOWLEDGE BASE</div>
          <h1>Knowledge Base</h1>
          <p>Standard operating procedures, runbooks, and IT documentation.</p>
        </div>
        <button className="primary-button" onClick={startNew}>
          ＋ New Article
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

      {showForm && (
        <div className="panel form-panel" style={{ marginBottom: 20 }}>
          <div className="panel-heading">
            <div><h2>{editing ? 'Edit Article' : 'Create Knowledge Base Article'}</h2></div>
            <button className="cancel-button" onClick={() => setShowForm(false)}>✕ Cancel</button>
          </div>
          <form onSubmit={handleSave}>
            <label>
              Article Title *
              <input
                name="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. WireGuard Gateway Recovery & Triage Runbook"
                required
              />
            </label>
            <label>
              Content / Documentation Steps *
              <textarea
                name="content"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={9}
                placeholder="Write detailed documentation, terminal commands, resolution steps, or guidance here…"
                required
              />
            </label>
            <div className="two-col">
              <label>
                Category
                <select name="category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>
                Publication Status
                <select name="status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button className="primary-button submit-button" disabled={saving} style={{ flex: 1 }}>
                {saving ? <><span className="spinner" /> Saving…</> : editing ? 'Update Article' : 'Publish Article'}
              </button>
              <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-grid" style={{ gridTemplateColumns: selected ? '1.1fr 1.3fr' : '1fr' }}>
        <div className="panel">
          <div className="panel-heading">
            <div><h2>Articles Directory</h2><p>{articles.length} article{articles.length !== 1 ? 's' : ''} available</p></div>
          </div>
          <div className="toolbar toolbar-flex" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="search-box" style={{ flex: 1 }}>
              <span>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search runbooks by title or keywords…"
              />
              {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
            </div>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="empty-state"><div className="loading-spinner" /><p>Loading documentation…</p></div>
          ) : articles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌘</div>
              <strong>No knowledge base articles found</strong>
              <p>{search || categoryFilter ? 'Try clearing your search terms or filters.' : 'Click "New Article" above to publish your first runbook.'}</p>
            </div>
          ) : (
            <div className="kb-list">
              {articles.map(a => {
                const canManage = isAdmin || a.author === user?.name || a.author === user?.email
                return (
                  <div
                    key={a.id}
                    className={`kb-card${selected?.id === a.id ? ' kb-card-active' : ''}`}
                    onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  >
                    <div className="kb-card-header">
                      <div>
                        <div className="kb-title">{a.title}</div>
                        <div className="kb-meta">
                          <span className="category-badge">{a.category}</span>
                          <span className={`pill ${a.status === 'PUBLISHED' ? 'resolved' : 'open'}`} style={{ fontSize: 9 }}>{a.status}</span>
                          {a.author && <span style={{ fontSize: 11, color: '#8fa3c8' }}>by {a.author}</span>}
                          <span style={{ fontSize: 11, color: '#8fa3c8' }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <div className="actions" onClick={e => e.stopPropagation()}>
                          <button className="action-btn" onClick={() => startEdit(a)} title="Edit article">Edit</button>
                          <button className="action-btn danger-text" onClick={() => handleDelete(a.id)} title="Delete article">Delete</button>
                        </div>
                      )}
                    </div>
                    <p className="kb-preview">{a.content?.substring(0, 140)}{a.content?.length > 140 ? '…' : ''}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="panel" style={{ position: 'sticky', top: 80, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div className="panel-heading">
              <div>
                <h2>{selected.title}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span className="category-badge">{selected.category}</span>
                  <span className={`pill ${selected.status === 'PUBLISHED' ? 'resolved' : 'open'}`} style={{ fontSize: 9 }}>{selected.status}</span>
                  {selected.author && <span style={{ fontSize: 11, color: '#8fa3c8' }}>Authored by {selected.author}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(isAdmin || selected.author === user?.name || selected.author === user?.email) && (
                  <button className="action-btn" onClick={() => startEdit(selected)}>✏ Edit</button>
                )}
                <button className="cancel-button" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="kb-content" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, padding: '0 20px 20px', color: 'var(--text-primary)' }}>
              {selected.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
