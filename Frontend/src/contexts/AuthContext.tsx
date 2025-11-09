import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, clearStoredAuth, fetchCurrentUser, getStoredToken, getStoredUser, login, persistToken, persistUser, signup } from '../lib/api'
import { AuthUser } from '../lib/types'

type AuthContextType = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: ApiError | null }>
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error: ApiError | null }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) {
    return error
  }
  if (error instanceof Error) {
    return new ApiError(500, error.message)
  }
  return new ApiError(500, 'Unexpected error')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [token, setToken] = useState<string | null>(() => getStoredToken())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const profile = await fetchCurrentUser()
        setUser(profile)
        persistUser(profile)
      } catch (error) {
        console.error('Failed to refresh session', error)
        clearStoredAuth()
        setUser(null)
        setToken(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAuthenticated = (auth: { token: string; user: AuthUser }) => {
    setToken(auth.token)
    setUser(auth.user)
    persistToken(auth.token)
    persistUser(auth.user)
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const auth = await login(email, password)
      handleAuthenticated(auth)
      return { error: null }
    } catch (error) {
      const apiError = toApiError(error)
      return { error: apiError }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    setLoading(true)
    try {
      const auth = await signup(fullName, email, password, companyName)
      handleAuthenticated(auth)
      return { error: null }
    } catch (error) {
      const apiError = toApiError(error)
      return { error: apiError }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    clearStoredAuth()
    setUser(null)
    setToken(null)
  }

  const refresh = async () => {
    if (!token) return
    setLoading(true)
    try {
      const profile = await fetchCurrentUser()
      setUser(profile)
      persistUser(profile)
    } catch (error) {
      console.error('Failed to refresh user profile', error)
      clearStoredAuth()
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo(
    () => ({
    user,
      token,
    loading,
    signIn,
    signUp,
    signOut,
      refresh
    }),
    [loading, token, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
