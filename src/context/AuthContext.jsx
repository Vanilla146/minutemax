import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = authService.getStoredUser()
        if (storedUser) {
            setUser(storedUser)
        }
        setLoading(false)
    }, [])

    const login = async (email, password) => {
        try {
            setError(null)
            const data = await authService.login({ email, password })
            setUser(data.user)
            return data
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Login failed'
            setError(errorMessage)
            throw new Error(errorMessage)
        }
    }

    const register = async (userData) => {
        try {
            setError(null)
            const data = await authService.register(userData)
            setUser(data.user)
            return data
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Registration failed'
            setError(errorMessage)
            throw new Error(errorMessage)
        }
    }

    const logout = () => {
        authService.logout()
        setUser(null)
    }

    const updateProfile = async (formData) => {
        try {
            const data = await authService.updateProfile(formData)
            setUser(data.user)
            return data
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Profile update failed')
        }
    }

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
