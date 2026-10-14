import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import AiChatbotWidget from '../components/AiChatbotWidget'

const navItems = [
  { to: '/', label: 'Overview', icon: '▦', end: true },
  { to: '/incidents', label: 'Incidents', icon: '◈' },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: '⌘' },
  { to: '/ai-assistant', label: 'AI Assistant', icon: '✧' },
]

const bottomNavItems = [
  { to: '/profile', label: 'My Profile', icon: '👤' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
    : 'U'

  // Dynamic breadcrumb generation based on current route
  const breadcrumb = useMemo(() => {
    const path = location.pathname
    if (path === '/') return { current: 'Operations Center' }
    if (path === '/incidents') return { current: 'Incident Management' }
    if (path === '/incidents/new') return { parent: { label: 'Incidents', to: '/incidents' }, current: 'Report Incident' }
    if (path.startsWith('/incidents/')) return { parent: { label: 'Incidents', to: '/incidents' }, current: 'Incident Details' }
    if (path === '/knowledge-base') return { current: 'Knowledge Base' }
    if (path === '/ai-assistant') return { current: 'AI Assistant' }
    if (path === '/users') return { current: 'User Management' }
    if (path === '/profile') return { current: 'My Profile' }
    if (path === '/settings') return { current: 'Settings & System' }
    return { current: 'Operations Center' }
  }, [location.pathname])

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} title="NexusOps Home">
          <div className="brand-mark">N</div>
          {!collapsed && (
            <div>
              <strong>NexusOps</strong>
              <small>INTELLIGENT IT OPS</small>
            </div>
          )}
          <button
            className="collapse-btn"
            onClick={(e) => {
              e.stopPropagation()
              setCollapsed(c => !c)
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <div className="nav-label">{!collapsed && 'WORKSPACE'}</div>

        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <span>{item.icon}</span>
            {!collapsed && item.label}
          </NavLink>
        ))}

        {!collapsed && <div className="nav-label" style={{ marginTop: 16 }}>ADMINISTRATION</div>}
        <NavLink
          to="/users"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          title={collapsed ? 'User Management' : undefined}
        >
          <span>👥</span>
          {!collapsed && (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              User Management
              {!isAdmin && <span style={{ fontSize: 9, opacity: 0.6, background: '#26344d', padding: '1px 5px', borderRadius: 4 }}>Admin</span>}
            </span>
          )}
        </NavLink>

        <div className="sidebar-bottom">
          {bottomNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{ marginBottom: 2 }}
            >
              <span>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}

          <div
            className="sidebar-user"
            onClick={() => navigate('/profile')}
            style={{ cursor: 'pointer' }}
            title="View Profile"
          >
            <div className="avatar">{initials}</div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <strong>{user?.name || 'User'}</strong>
                <small>{user?.role || 'USER'}</small>
              </div>
            )}
            {!collapsed ? (
              <button
                className="logout-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogout()
                }}
                title="Logout"
              >
                ⏻
              </button>
            ) : null}
          </div>

          {collapsed && (
            <button
              className="logout-btn"
              onClick={handleLogout}
              title="Logout"
              style={{ margin: '6px auto 0' }}
            >
              ⏻
            </button>
          )}
        </div>
      </aside>

      <main className={`main${collapsed ? ' main-collapsed' : ''}`}>
        <header className="topbar">
          <div className="breadcrumb">
            <Link to="/" className="breadcrumb-app" style={{ cursor: 'pointer' }} title="Go to Dashboard">
              NexusOps
            </Link>
            <span className="breadcrumb-sep">/</span>
            {breadcrumb.parent && (
              <>
                <Link to={breadcrumb.parent.to} className="breadcrumb-app" style={{ cursor: 'pointer' }}>
                  {breadcrumb.parent.label}
                </Link>
                <span className="breadcrumb-sep">/</span>
              </>
            )}
            <strong className="breadcrumb-current">{breadcrumb.current}</strong>
          </div>
          <div className="top-right">
            <span className="system-status">
              <i className="status-dot" />
              API Connected
            </span>
            <div className="topbar-user" onClick={() => navigate('/profile')} title="My Profile">
              <div className="avatar avatar-sm">{initials}</div>
              <span className="topbar-name">{user?.name}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
        <AiChatbotWidget />
      </main>
    </div>
  )
}

