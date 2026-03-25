import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import QueuePage from './pages/QueuePage'
import QueueQRPage from './pages/QueueQRPage'
import OutfitMatchPage from './pages/OutfitMatchPage'
import Dashboard from './pages/Dashboard'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import AdminDashboard from './pages/admin/AdminDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import './App.css'

// Role-based dashboard routing component
const RoleBasedDashboard = () => {
    const { user, isAuthenticated, loading } = useAuth()

    // Show loading while checking auth
    if (loading) {
        return <div className="loading-container"><p>Loading...</p></div>
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Redirect based on user role
    const role = user?.role?.toLowerCase()

    if (role === 'admin') {
        return <Navigate to="/admin" replace />
    } else if (role === 'staff') {
        return <Navigate to="/staff" replace />
    }

    // Default: show customer dashboard
    return <Dashboard />
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app">
                    <Navbar />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/queue" element={<QueuePage />} />
                            <Route path="/queue/qr" element={<QueueQRPage />} />
                            <Route path="/outfit-match" element={<OutfitMatchPage />} />
                            <Route path="/dashboard" element={<RoleBasedDashboard />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/staff/*" element={<StaffDashboard />} />
                            <Route path="/admin/*" element={<AdminDashboard />} />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </AuthProvider>
    )
}

export default App
