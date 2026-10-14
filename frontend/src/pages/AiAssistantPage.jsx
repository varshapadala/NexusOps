import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../AuthContext'
import api from '../api'

const CATEGORIZED_SUGGESTIONS = {
  '🌐 Network & VPN': [
    'How do I troubleshoot WireGuard VPN connectivity failure?',
    'List standard Linux network diagnostic commands',
    'How do I diagnose high latency and packet loss between servers?'
  ],
  '🗄 Database': [
    'What steps should I take during a high database replication lag?',
    'How to diagnose slow database queries and transaction locks?',
    'How do I tune HikariCP database connection pool?'
  ],
  '⚡ CPU & System': [
    'High CPU usage diagnostic and troubleshooting commands',
    'How do I find out-of-memory (OOM) errors and memory leaks?',
    'Check disk storage, inode exhaustion, and log rotation'
  ],
  '🔐 Security & SSO': [
    'How to diagnose slow SAML SSO authentication?',
    'How to check SSL / TLS certificate expiration via CLI?'
  ],
  '📋 Runbooks & Triage': [
    'Generate an emergency service recovery runbook',
    'Summarize current operations tickets in the system'
  ]
}

function getFollowUpSuggestions(text) {
  const q = (text || '').toLowerCase()
  if (q.includes('vpn') || q.includes('wireguard') || q.includes('network')) {
    return [
      'Show WireGuard restart commands',
      'How to fix MTU packet fragmentation?',
      'Generate VPN recovery runbook'
    ]
  }
  if (q.includes('database') || q.includes('sql') || q.includes('latency') || q.includes('replication')) {
    return [
      'How to terminate blocked PostgreSQL queries?',
      'HikariCP pool optimization guide',
      'Generate database runbook'
    ]
  }
  if (q.includes('cpu') || q.includes('memory') || q.includes('oom') || q.includes('load')) {
    return [
      'How do I take a Java thread dump?',
      'Top commands for memory analysis',
      'Generate high CPU runbook'
    ]
  }
  return [
    'Show diagnostic CLI commands for this',
    'Generate a step-by-step Runbook',
    'What are the common root causes?'
  ]
}

export default function AiAssistantPage() {
  const { user } = useAuth()
  const [aiConfig, setAiConfig] = useState({ configured: true, provider: 'Ops-AI Engine', model: 'OpsAI-v2' })
  const [configLoading, setConfigLoading] = useState(true)
  const [incidents, setIncidents] = useState([])
  const [selectedIncidentId, setSelectedIncidentId] = useState('')
  const [activeTab, setActiveTab] = useState('🌐 Network & VPN')

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I'm your NexusOps AI Assistant.\n\nI can help analyze incidents, provide diagnostic commands, and generate runbooks with real-time Knowledge Base retrieval. Choose a suggested topic below or ask your own question!`,
      timestamp: new Date(),
      followUps: [
        'How do I troubleshoot WireGuard VPN connectivity failure?',
        'What steps should I take during a high database replication lag?',
        'High CPU and memory leak troubleshooting commands'
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorNotice, setErrorNotice] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Check real backend configuration and fetch incidents on mount
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      api.get('/ai/status'),
      api.get('/incidents')
    ]).then(([statusRes, incRes]) => {
      if (!cancelled) {
        if (statusRes.status === 'fulfilled' && statusRes.value.data) {
          setAiConfig(statusRes.value.data)
        }
        if (incRes.status === 'fulfilled' && incRes.value.data) {
          setIncidents(incRes.value.data)
        }
        setConfigLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  async function sendMessage(text) {
    const rawMsg = text || input.trim()
    if (!rawMsg || loading) return
    setInput('')
    setErrorNotice('')
    setSaveNotice('')

    // Prepend incident context if selected
    let fullQuery = rawMsg
    if (selectedIncidentId) {
      const inc = incidents.find(i => String(i.id) === String(selectedIncidentId))
      if (inc && !rawMsg.includes(`INC-${inc.id}`)) {
        fullQuery = `[Context: INC-${String(inc.id).padStart(4, '0')} - ${inc.title} (${inc.category}, ${inc.priority})]: ${rawMsg}`
      }
    }

    const userMsg = { role: 'user', content: rawMsg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.post('/ai/chat', { message: fullQuery })
      const followUps = getFollowUpSuggestions(rawMsg + ' ' + res.data.content)
      const aiMsg = {
        role: 'assistant',
        content: res.data.content,
        timestamp: new Date(),
        ragArticles: res.data.ragArticles || [],
        ragIncidents: res.data.ragIncidents || [],
        followUps
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const backendError = err.response?.data?.error || 'Unable to connect to AI assistant.'
      setErrorNotice(backendError)
      const fallbackMsg = {
        role: 'assistant',
        content: `⚠ **Request failed:** ${backendError}\n\nPlease verify that the NexusOps backend server is running on http://localhost:8080.`,
        timestamp: new Date(),
        followUps: ['Try another question', 'Check API health']
      }
      setMessages(prev => [...prev, fallbackMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function handleSaveAsKb(content) {
    try {
      const firstLine = content.split('\n').find(l => l.trim().length > 0) || 'AI Runbook'
      const title = firstLine.replace(/^[#\s*]+/, '').slice(0, 80) || 'AI Generated Runbook'
      await api.post('/kb', {
        title: title.startsWith('Runbook:') ? title : `Runbook: ${title}`,
        content,
        category: 'GENERAL',
        status: 'PUBLISHED'
      })
      setSaveNotice(`✓ Successfully saved "${title}" to your Knowledge Base!`)
      setTimeout(() => setSaveNotice(''), 5000)
    } catch {
      setErrorNotice('Failed to save article to Knowledge Base.')
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
    setSaveNotice('✓ Copied response to clipboard!')
    setTimeout(() => setSaveNotice(''), 3000)
  }

  function clearChat() {
    if (window.confirm('Reset conversation?')) {
      setMessages([
        {
          role: 'assistant',
          content: `Conversation reset. Choose a suggested topic below or ask your own question!`,
          timestamp: new Date(),
          followUps: [
            'How do I troubleshoot WireGuard VPN connectivity failure?',
            'What steps should I take during a high database replication lag?',
            'High CPU and memory leak troubleshooting commands'
          ]
        }
      ])
    }
  }

  return (
    <div>
      <section className="page-heading">
        <div>
          <div className="eyebrow">INTELLIGENT OPERATIONS</div>
          <h1>AI Operations Assistant</h1>
          <p>Triage active incidents, generate runbooks, and query IT diagnostics with knowledge base retrieval.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="ai-status-badge">
            <span className="status-dot" />
            {configLoading ? 'Checking…' : `AI Online (${aiConfig.provider || 'Ops-AI Engine'})`}
          </div>
          <button className="secondary-button" onClick={clearChat} title="Clear conversation">
            ✕ Clear
          </button>
        </div>
      </section>

      {saveNotice && (
        <div className="alert" style={{ marginBottom: 16 }}>
          <span>{saveNotice}</span>
          <button onClick={() => setSaveNotice('')}>✕</button>
        </div>
      )}

      {errorNotice && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          <span>⚠ {errorNotice}</span>
          <button onClick={() => setErrorNotice('')}>✕</button>
        </div>
      )}

      <div className="ai-layout">
        <div className="panel ai-chat-panel">
          {/* Incident Context Selector Bar */}
          <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6f7a8e' }}>CONTEXT TICKET:</span>
            <select
              className="filter-select"
              style={{ fontSize: 11, padding: '3px 8px', maxWidth: 360 }}
              value={selectedIncidentId}
              onChange={e => setSelectedIncidentId(e.target.value)}
            >
              <option value="">— Entire Infrastructure (General) —</option>
              {incidents.map(i => (
                <option key={i.id} value={i.id}>
                  INC-{String(i.id).padStart(4, '0')}: {i.title} ({i.priority})
                </option>
              ))}
            </select>
            {selectedIncidentId && (
              <span className="category-badge" style={{ fontSize: 9 }}>
                Context Active
              </span>
            )}
          </div>

          <div className="ai-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                <div className="ai-message-avatar">
                  {msg.role === 'assistant' ? '✧' : (user?.name?.[0] || 'U')}
                </div>
                <div className="ai-message-body">
                  <div className="ai-message-meta">
                    {msg.role === 'assistant' ? 'NexusOps AI' : user?.name || 'You'}
                    <span className="ai-message-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="ai-message-content" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                    {msg.role === 'assistant' && idx > 0 && (
                      <div className="ai-msg-actions">
                        <button className="ai-action-btn" onClick={() => copyToClipboard(msg.content)}>
                          📋 Copy
                        </button>
                        <button className="ai-action-btn" onClick={() => handleSaveAsKb(msg.content)}>
                          💾 Save to Knowledge Base
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contextual Follow-Up Suggestions directly under assistant message */}
                  {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                    <div className="ai-followups" style={{ marginTop: 8 }}>
                      <span className="ai-followups-label">💡 Suggested follow-ups:</span>
                      <div className="ai-followup-chips">
                        {msg.followUps.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            className="ai-followup-btn"
                            onClick={() => sendMessage(p)}
                            disabled={loading}
                          >
                            {p} →
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message ai-message-assistant">
                <div className="ai-message-avatar">✧</div>
                <div className="ai-message-body">
                  <div className="ai-message-meta">NexusOps AI (Analyzing Runbooks & Systems…)</div>
                  <div className="ai-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Categorized Question Suggestions Bar */}
          <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>💡 SUGGESTIONS:</span>
              <div className="ai-cat-tabs" style={{ margin: 0 }}>
                {Object.keys(CATEGORIZED_SUGGESTIONS).map(cat => (
                  <button
                    key={cat}
                    className={`ai-cat-tab${activeTab === cat ? ' active' : ''}`}
                    onClick={() => setActiveTab(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="ai-suggestions-list">
              {CATEGORIZED_SUGGESTIONS[activeTab].map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  className="ai-suggestion-chip"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  💬 {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-input-area" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="ai-input-row">
              <textarea
                className="ai-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about operations triage, runbooks, or diagnostic commands… (Enter to send)"
                rows={2}
                disabled={loading}
              />
              <button
                className="primary-button ai-send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                {loading ? <span className="spinner" /> : '↑ Send'}
              </button>
            </div>
          </div>
        </div>

        <div className="panel ai-sidebar">
          <div className="panel-heading">
            <div><h2>AI Capabilities</h2><p>Real-time operational triage</p></div>
          </div>
          <div style={{ padding: '0 18px 18px' }}>
            {[
              { icon: '🔍', title: 'Incident Diagnostics', desc: 'Analyzes logs, alerts, and correlates root causes' },
              { icon: '📋', title: 'Runbook Generation', desc: 'Produces SOP recovery guides and step-by-step procedures' },
              { icon: '⌘', title: 'Knowledge Base RAG', desc: 'Retrieves relevant team articles and past incidents' },
              { icon: '🔧', title: 'CLI Synthesis', desc: 'Generates ready-to-run Linux and Windows commands' },
            ].map(item => (
              <div key={item.title} className="ai-capability">
                <span className="ai-cap-icon">{item.icon}</span>
                <div>
                  <div className="ai-cap-title">{item.title}</div>
                  <div className="ai-cap-desc">{item.desc}</div>
                </div>
              </div>
            ))}

            <div className="ai-config-info">
              <strong>Engine Status</strong>
              <p>Active Engine: <code>{aiConfig.provider || 'Built-in Ops-AI'}</code></p>
              <p style={{ marginTop: 6 }}>Model: <code>{aiConfig.model || 'OpsAI-v2'}</code></p>
              <p style={{ marginTop: 6, fontSize: 11, color: '#6f7a8e' }}>
                RAG Context Retrieval: <strong>Enabled</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
