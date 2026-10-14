import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'

const SUGGESTIONS = {
  '🌐 Network & VPN': [
    'How do I troubleshoot WireGuard VPN connectivity failure?',
    'Show Linux network latency & packet loss diagnostic commands',
    'How do I test DNS resolution and port connectivity?'
  ],
  '🗄 Database': [
    'What steps should I take during a high database replication lag?',
    'How to diagnose slow database queries and table locks?',
    'How do I optimize HikariCP connection pool settings?'
  ],
  '⚡ CPU & Memory': [
    'High CPU usage diagnostic and troubleshooting commands',
    'How do I find out-of-memory (OOM) errors and memory leaks?',
    'Commands to check disk space and inode saturation'
  ],
  '🔐 Login & Auth': [
    'How to diagnose slow SAML SSO token authentication?',
    'How to check SSL / TLS certificate expiration via CLI?'
  ],
  '📋 Operations': [
    'Summarize current active incidents in the workspace',
    'Generate a disaster recovery runbook for service outage'
  ]
}

function getFollowUpSuggestions(text) {
  const q = (text || '').toLowerCase()
  if (q.contains?.('vpn') || q.includes('vpn') || q.includes('network') || q.includes('wireguard')) {
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

export default function AiChatbotWidget() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('🌐 Network & VPN')
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false)

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your NexusOps AI Assistant.\n\nI can help diagnose infrastructure issues, provide shell commands, and generate incident runbooks. Choose a suggestion below or type your question!`,
      timestamp: new Date(),
      followUps: [
        'How do I troubleshoot WireGuard VPN connectivity failure?',
        'What steps should I take during a high database replication lag?',
        'High CPU usage diagnostic and troubleshooting commands'
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  async function sendMessage(text) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setShowSuggestionsMenu(false)

    const userMsg = { role: 'user', content: msg, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.post('/ai/chat', { message: msg })
      const followUps = getFollowUpSuggestions(msg + ' ' + res.data.content)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.content,
          timestamp: new Date(),
          ragArticles: res.data.ragArticles || [],
          followUps
        }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠ ' + (err.response?.data?.error || 'Unable to connect to AI engine. Please ensure backend is running.'),
          timestamp: new Date(),
          followUps: ['Try another question', 'Check API health']
        }
      ])
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

  function copyText(txt) {
    navigator.clipboard?.writeText(txt)
  }

  function resetChat() {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation restarted. How can I assist your operations workflow?`,
        timestamp: new Date(),
        followUps: [
          'How do I troubleshoot WireGuard VPN connectivity failure?',
          'What steps should I take during a high database replication lag?',
          'High CPU usage diagnostic and troubleshooting commands'
        ]
      }
    ])
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!open && (
        <button
          className="ai-floating-trigger"
          onClick={() => setOpen(true)}
          title="Open NexusOps AI Chatbot"
        >
          <span className="ai-floating-pulse" />
          <span>✧ Ask AI Assistant</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {open && (
        <div className="ai-floating-window">
          <div className="ai-floating-header">
            <strong>
              <span>✧</span>
              <span>NexusOps AI Chatbot</span>
            </strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="ai-floating-header-btn"
                onClick={resetChat}
                title="Restart conversation"
              >
                ↻
              </button>
              <button
                className="ai-floating-header-btn"
                onClick={() => { setOpen(false); navigate('/ai-assistant') }}
                title="Open full-page console"
              >
                ⤢
              </button>
              <button
                className="ai-floating-header-btn"
                onClick={() => setOpen(false)}
                title="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="ai-floating-body">
            <div className="ai-floating-messages">
              {messages.map((m, idx) => (
                <div key={idx} className={`ai-message ai-message-${m.role}`}>
                  <div className="ai-message-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
                    {m.role === 'assistant' ? '✧' : (user?.name?.[0] || 'U')}
                  </div>
                  <div className="ai-message-body" style={{ maxWidth: '85%' }}>
                    <div className="ai-message-content" style={{ fontSize: 12, padding: '9px 13px', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                      {m.role === 'assistant' && idx > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <button
                            className="ai-action-btn"
                            style={{ fontSize: 10, padding: '2px 7px' }}
                            onClick={() => copyText(m.content)}
                          >
                            📋 Copy
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contextual Follow-Up Suggestions directly under assistant message */}
                    {m.role === 'assistant' && m.followUps && m.followUps.length > 0 && (
                      <div className="ai-followups">
                        <span className="ai-followups-label">💡 Suggested follow-ups:</span>
                        <div className="ai-followup-chips">
                          {m.followUps.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              className="ai-followup-btn"
                              onClick={() => sendMessage(prompt)}
                              disabled={loading}
                            >
                              {prompt} →
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
                  <div className="ai-message-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>✧</div>
                  <div className="ai-message-body">
                    <div className="ai-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Always-accessible Collapsible Suggestions Drawer */}
            {showSuggestionsMenu && (
              <div className="ai-suggestions-box" style={{ margin: '8px 12px 0' }}>
                <div className="ai-suggestions-title">
                  <span>💡 SUGGESTED TOPICS TO ASK:</span>
                  <button
                    onClick={() => setShowSuggestionsMenu(false)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
                <div className="ai-cat-tabs">
                  {Object.keys(SUGGESTIONS).map(cat => (
                    <button
                      key={cat}
                      className={`ai-cat-tab${selectedCategory === cat ? ' active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="ai-suggestions-list">
                  {SUGGESTIONS[selectedCategory].map((s, i) => (
                    <button
                      key={i}
                      className="ai-suggestion-chip"
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                    >
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="ai-floating-footer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <button
                  type="button"
                  className="ai-action-btn"
                  style={{ fontSize: 10, padding: '2px 8px', color: '#4f46e5', borderColor: '#c7d2fe' }}
                  onClick={() => setShowSuggestionsMenu(prev => !prev)}
                >
                  💡 {showSuggestionsMenu ? 'Hide suggestions' : 'Browse suggested questions'}
                </button>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Press Enter to send</span>
              </div>

              <div className="ai-input-row">
                <textarea
                  className="ai-input"
                  style={{ fontSize: 12, padding: '7px 10px', minHeight: 38, maxHeight: 80 }}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or pick a suggestion above…"
                  disabled={loading}
                />
                <button
                  className="primary-button ai-send-btn"
                  style={{ padding: '7px 14px', fontSize: 12 }}
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
