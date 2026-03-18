import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiUser, FiClock, FiHeart, FiShoppingBag, FiSettings, FiLogOut, FiChevronRight, FiBell, FiLoader } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { queueService, favoriteService } from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
    const { user, logout, isAuthenticated, loading: authLoading, updateProfile } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('overview')
    const [queueHistory, setQueueHistory] = useState([])
    const [favorites, setFavorites] = useState([])
    const [loading, setLoading] = useState(true)
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
        phone: ''
    })

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login')
        }
    }, [isAuthenticated, authLoading, navigate])

    // Load user data
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || ''
            })
            loadUserData()
        }
    }, [user])

    const loadUserData = async () => {
        setLoading(true)
        try {
            // Load queue history
            const history = await queueService.getHistory()
            setQueueHistory(Array.isArray(history) ? history : [])
        } catch (err) {
            console.log('Could not load queue history')
        }

        try {
            // Load favorites
            const favs = await favoriteService.getAll()
            setFavorites(Array.isArray(favs) ? favs : [])
        } catch (err) {
            console.log('Could not load favorites')
        }
        setLoading(false)
    }

    // Calculate stats from real data
    const stats = [
        { label: 'Queue Joins', value: queueHistory.length || 0, icon: <FiClock />, color: '#667eea' },
        { label: 'Time Saved', value: `${Math.round(queueHistory.length * 5)}m`, icon: <FiClock />, color: '#10b981' },
        { label: 'Saved Items', value: favorites.length || 0, icon: <FiHeart />, color: '#f093fb' },
        { label: 'Activity', value: queueHistory.filter(q => q.status === 'completed').length || 0, icon: <FiShoppingBag />, color: '#f5576c' }
    ]

    // Format queue history for recent activity
    const recentActivity = queueHistory.slice(0, 5).map((q, index) => ({
        id: q.id || index,
        type: 'queue',
        message: `${q.queue_type === 'fitting_room' ? 'Fitting Room' : 'Checkout'} at ${q.store_name || 'MinuteMax Store'}`,
        time: q.joined_at ? new Date(q.joined_at).toLocaleDateString() : 'Recently'
    }))

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FiUser /> },
        { id: 'history', label: 'Queue History', icon: <FiClock /> },
        { id: 'outfits', label: 'Saved Items', icon: <FiHeart /> },
        { id: 'settings', label: 'Settings', icon: <FiSettings /> }
    ]

    // Show loading or redirect if not authenticated
    if (authLoading) {
        return (
            <div className="dashboard-page">
                <div className="loading-container">
                    <FiLoader className="spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null // Will redirect via useEffect
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-bg-gradient" />

            <div className="container">
                <div className="dashboard-layout">
                    {/* Sidebar */}
                    <aside className="dashboard-sidebar">
                        <div className="user-card">
                            <div className="user-avatar">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} />
                                ) : (
                                    <span>{user.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className="user-info">
                                <h3>{user.name}</h3>
                                <p>{user.email}</p>
                            </div>
                        </div>

                        <nav className="sidebar-nav">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                    <FiChevronRight className="nav-arrow" />
                                </button>
                            ))}
                        </nav>

                        <button className="logout-btn" onClick={() => { logout(); navigate('/'); }}>
                            <FiLogOut />
                            <span>Log Out</span>
                        </button>
                    </aside>

                    {/* Main Content */}
                    <main className="dashboard-main">
                        {(loading || authLoading) ? (
                            <div className="loading-container">
                                <FiLoader className="spinner" />
                                <p>Loading your dashboard...</p>
                            </div>
                        ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTab === 'overview' && (
                                <>
                                    <div className="dashboard-header">
                                        <div>
                                            <h1>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h1>
                                            <p>Here's your shopping activity summary</p>
                                        </div>
                                        <button className="notification-btn">
                                            <FiBell />
                                            <span className="notification-badge">3</span>
                                        </button>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="stats-grid">
                                        {stats.map((stat, index) => (
                                            <motion.div
                                                key={index}
                                                className="stat-card"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                                                    {stat.icon}
                                                </div>
                                                <div className="stat-content">
                                                    <div className="stat-value">{stat.value}</div>
                                                    <div className="stat-label">{stat.label}</div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="section-card">
                                        <div className="section-header">
                                            <h2>Recent Activity</h2>
                                            <button className="view-all-btn">View All</button>
                                        </div>
                                        <div className="activity-list">
                                            {recentActivity.map(activity => (
                                                <div key={activity.id} className="activity-item">
                                                    <div className={`activity-icon ${activity.type}`}>
                                                        {activity.type === 'queue' && <FiClock />}
                                                        {activity.type === 'outfit' && <FiHeart />}
                                                        {activity.type === 'purchase' && <FiShoppingBag />}
                                                    </div>
                                                    <div className="activity-content">
                                                        <p>{activity.message}</p>
                                                        <span>{activity.time}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Saved Outfits Preview */}
                                    <div className="section-card">
                                        <div className="section-header">
                                            <h2>Saved Items</h2>
                                            <button className="view-all-btn" onClick={() => setActiveTab('outfits')}>View All</button>
                                        </div>
                                        <div className="outfits-preview">
                                            {favorites.length > 0 ? favorites.slice(0, 3).map(item => (
                                                <div key={item.id} className="outfit-preview-card">
                                                    <img src={item.image_url || 'https://picsum.photos/seed/item/400/400'} alt={item.name} />
                                                    <div className="outfit-preview-info">
                                                        <h4>{item.name}</h4>
                                                        <span>Rs. {item.price}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="no-data">No saved items yet</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'history' && (
                                <div className="tab-content">
                                    <h1>Queue History</h1>
                                    <p className="tab-description">View all your past queue sessions</p>

                                    <div className="history-list">
                                        {queueHistory.length > 0 ? queueHistory.map((queue, i) => (
                                            <div key={queue.id || i} className="history-card">
                                                <div className="history-icon">
                                                    <FiClock />
                                                </div>
                                                <div className="history-content">
                                                    <h4>{queue.queue_type === 'fitting_room' ? 'Fitting Room' : 'Checkout Counter'}</h4>
                                                    <p>{queue.store_name || 'MinuteMax Fashion Store'}</p>
                                                    <span className="history-date">{queue.joined_at ? new Date(queue.joined_at).toLocaleString() : 'Recently'}</span>
                                                </div>
                                                <div className="history-stats">
                                                    <div className="history-stat">
                                                        <span className="stat-num">{queue.queue_type === 'fitting_room' ? 8 : 3}</span>
                                                        <span className="stat-text">min saved</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="no-data">No queue history yet. Join a queue to get started!</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'outfits' && (
                                <div className="tab-content">
                                    <h1>Saved Items</h1>
                                    <p className="tab-description">Your favorite items from the store</p>

                                    <div className="saved-outfits-grid">
                                        {favorites.length > 0 ? favorites.map((item, i) => (
                                            <div key={item.id || i} className="saved-outfit-card">
                                                <div className="outfit-image">
                                                    <img src={item.image_url || 'https://picsum.photos/seed/item/400/400'} alt={item.name} />
                                                </div>
                                                <div className="outfit-details">
                                                    <h4>{item.name}</h4>
                                                    <span>Rs. {item.price}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="no-data">No saved items yet. Browse products and add favorites!</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="tab-content">
                                    <h1>Settings</h1>
                                    <p className="tab-description">Manage your account preferences</p>

                                    <div className="settings-section">
                                        <h3>Profile Information</h3>
                                        <div className="settings-form">
                                            <div className="form-group">
                                                <label>Full Name</label>
                                                <input 
                                                    type="text" 
                                                    value={profileForm.name}
                                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email</label>
                                                <input 
                                                    type="email" 
                                                    value={profileForm.email}
                                                    disabled
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input 
                                                    type="tel" 
                                                    value={profileForm.phone}
                                                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3>Notifications</h3>
                                        <div className="toggle-group">
                                            <div className="toggle-item">
                                                <span>Queue Updates</span>
                                                <label className="toggle">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                            <div className="toggle-item">
                                                <span>Outfit Recommendations</span>
                                                <label className="toggle">
                                                    <input type="checkbox" defaultChecked />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                            <div className="toggle-item">
                                                <span>Promotional Offers</span>
                                                <label className="toggle">
                                                    <input type="checkbox" />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <button className="btn btn-primary" onClick={async () => {
                                        try {
                                            const formData = new FormData()
                                            formData.append('name', profileForm.name)
                                            formData.append('phone', profileForm.phone)
                                            await updateProfile(formData)
                                            alert('Profile updated successfully!')
                                        } catch (err) {
                                            alert('Failed to update profile')
                                        }
                                    }}>Save Changes</button>
                                </div>
                            )}
                        </motion.div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
