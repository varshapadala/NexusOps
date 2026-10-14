import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('nexusops_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Sync with backend on mount if token is present
  useEffect(() => {
    const token = localStorage.getItem('nexusops_token')
    if (token) {
      api.get('/auth/me')
        .then(res => {
          if (res.data) {
            setUser(prev => {
              const updated = { ...prev, ...res.data }
              localStorage.setItem('nexusops_user', JSON.stringify(updated))
              return updated
            })
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('nexusops_token')
          localStorage.removeItem('nexusops_user')
          setUser(null)
        })
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, userId, ...rest } = response.data
    const userData = { ...rest, id: userId }
    localStorage.setItem('nexusops_token', token)
    localStorage.setItem('nexusops_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password })
    const { token, userId, ...rest } = response.data
    const userData = { ...rest, id: userId }
    localStorage.setItem('nexusops_token', token)
    localStorage.setItem('nexusops_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const updateUser = useCallback((userData, token) => {
    if (token) localStorage.setItem('nexusops_token', token)
    localStorage.setItem('nexusops_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('nexusops_token')
    localStorage.removeItem('nexusops_user')
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
