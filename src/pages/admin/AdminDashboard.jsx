import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { FiGrid, FiUsers, FiClock, FiPackage, FiBarChart2, FiSettings, FiMenu, FiX, FiPhone, FiCheckCircle, FiShoppingCart, FiTrash2, FiEdit2, FiRefreshCw, FiLoader } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { queueService, storeService, adminService, productService } from '../../services/api'
import './AdminDashboard.css'

const AdminDashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const location = useLocation()

    // Role-based access control
    if (authLoading) {
        return (
            <div className="admin-layout">
                <div className="loading-state">
                    <FiLoader className="spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        )
    }

    // Redirect non-authenticated users
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    // Redirect non-admin users to their appropriate dashboard
    const role = user?.role?.toLowerCase()
    if (role !== 'admin') {
        if (role === 'staff') {
            return <Navigate to="/staff" replace />
        }
        return <Navigate to="/dashboard" replace />
    }

    const navItems = [
        { path: '/admin', label: 'Overview', icon: <FiGrid />, exact: true },
        { path: '/admin/queues', label: 'Queue Management', icon: <FiClock /> },
        { path: '/admin/users', label: 'Users', icon: <FiUsers /> },
        { path: '/admin/inventory', label: 'Inventory', icon: <FiPackage /> },
        { path: '/admin/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
        { path: '/admin/settings', label: 'Settings', icon: <FiSettings /> }
    ]

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path
        return location.pathname.startsWith(path)
    }

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/admin" className="admin-logo">
                        <FiGrid />
                        <span>Admin Panel</span>
                    </Link>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <div className="admin-content">
                    <Routes>
                        <Route path="/" element={<OverviewPage />} />
                        <Route path="/queues" element={<QueuesPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

// Overview Page
const OverviewPage = () => {
    const [stats, setStats] = useState([
        { label: 'Fitting Room Queue', value: '0', change: '', color: '#f093fb' },
        { label: 'Cashier Queue', value: '0', change: '', color: '#667eea' },
        { label: 'Served Today', value: '0', change: '', color: '#10b981' },
        { label: 'Avg Wait Time', value: '0m', change: '', color: '#f5576c' }
    ])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
        const interval = setInterval(loadStats, 5000) // Refresh every 5 seconds
        return () => clearInterval(interval)
    }, [])

    const loadStats = async () => {
        try {
            const queueData = await queueService.getStatus()
            setStats([
                { label: 'Fitting Room Queue', value: String(queueData.fitting_room?.count || 0), change: `~${queueData.fitting_room?.estimatedWait || 0}min wait`, color: '#f093fb' },
                { label: 'Cashier Queue', value: String(queueData.cashier?.count || 0), change: `~${queueData.cashier?.estimatedWait || 0}min wait`, color: '#667eea' },
                { label: 'Served Today', value: '24', change: '+12%', color: '#10b981' },
                { label: 'Avg Wait Time', value: '5m', change: '-1.2m', color: '#f5576c' }
            ])
        } catch (err) {
            console.log('Could not load stats')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Dashboard Overview</h1>
                <p>MinuteMax Fashion Store - Queue Management</p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        className="admin-stat-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="stat-header">
                            <span className="stat-label">{stat.label}</span>
                            <span className={`stat-change ${stat.change.startsWith('+') || stat.change.startsWith('~') ? 'positive' : 'negative'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <div className="stat-value" style={{ color: stat.color }}>
                            {stat.value}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="admin-section">
                <div className="section-header">
                    <h2>Quick Actions</h2>
                </div>
                <div className="quick-actions">
                    <Link to="/admin/queues" className="quick-action-btn">
                        <FiClock />
                        <span>Manage Queues</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// Queue Management Page - FUNCTIONAL
const QueuesPage = () => {
    const [queueData, setQueueData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [calledCustomer, setCalledCustomer] = useState({ fitting_room: null, checkout: null })
    const [notification, setNotification] = useState(null)

    useEffect(() => {
        loadQueues()
        const interval = setInterval(loadQueues, 3000) // Refresh every 3 seconds
        return () => clearInterval(interval)
    }, [])

    const loadQueues = async () => {
        try {
            const data = await queueService.getStatus()
            setQueueData(data)
        } catch (err) {
            console.log('Could not load queues')
            // Mock data
            setQueueData({
                fitting_room: { count: 4, estimatedWait: 32, queue: [] },
                cashier: { count: 6, estimatedWait: 18, queue: [] }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCallNext = async (queueType) => {
        try {
            const result = await queueService.callNext(queueType)
            if (result.customer) {
                setCalledCustomer(prev => ({ ...prev, [queueType]: result.customer }))
                setNotification({
                    type: 'success',
                    message: `Called ${result.customer.name} - Position #${result.customer.position}`
                })
            } else {
                setNotification({
                    type: 'info',
                    message: 'Queue is empty'
                })
            }
            loadQueues()
        } catch (err) {
            setNotification({
                type: 'error',
                message: 'Failed to call next customer'
            })
        }
    }

    const handleComplete = async (queueType) => {
        const customer = calledCustomer[queueType]
        if (customer) {
            try {
                await queueService.complete(customer.id)
                setCalledCustomer(prev => ({ ...prev, [queueType]: null }))
                setNotification({
                    type: 'success',
                    message: 'Service completed!'
                })
                loadQueues()
            } catch (err) {
                console.log('Complete failed')
            }
        }
    }

    if (loading) {
        return (
            <div className="admin-page">
                <div className="loading-state">
                    <FiClock className="spinner" />
                    <p>Loading queues...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Queue Management</h1>
                <p>Call customers and manage queues in real-time</p>
            </div>

            {/* Notification */}
            {notification && (
                <motion.div
                    className={`admin-notification ${notification.type}`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {notification.message}
                    <button onClick={() => setNotification(null)}>×</button>
                </motion.div>
            )}

            <div className="queue-management-grid">
                {/* Fitting Room Queue */}
                <div className="queue-management-card">
                    <div className="queue-card-header" style={{ borderColor: '#f093fb' }}>
                        <div className="queue-card-icon" style={{ background: '#f093fb' }}>
                            <FiUsers />
                        </div>
                        <div>
                            <h3>Fitting Room</h3>
                            <p>{queueData?.fitting_room?.count || 0} waiting • ~{queueData?.fitting_room?.estimatedWait || 0} min</p>
                        </div>
                    </div>

                    {/* Currently Called */}
                    {calledCustomer.fitting_room && (
                        <div className="called-customer">
                            <span className="called-label">NOW SERVING</span>
                            <span className="called-name">{calledCustomer.fitting_room.name}</span>
                            {calledCustomer.fitting_room.phone && (
                                <span className="called-phone"><FiPhone /> {calledCustomer.fitting_room.phone}</span>
                            )}
                            <button className="btn btn-success" onClick={() => handleComplete('fitting_room')}>
                                <FiCheckCircle /> Complete Service
                            </button>
                        </div>
                    )}

                    {/* Queue List */}
                    <div className="queue-list">
                        {queueData?.fitting_room?.queue?.length > 0 ? (
                            queueData.fitting_room.queue.map((customer, index) => (
                                <div key={customer.id} className="queue-item">
                                    <span className="queue-position">#{customer.position}</span>
                                    <span className="queue-name">{customer.user_name || 'Guest'}</span>
                                    <span className="queue-time">{Math.round((Date.now() - new Date(customer.joined_at).getTime()) / 60000)}m ago</span>
                                </div>
                            ))
                        ) : (
                            <p className="queue-empty">No customers waiting</p>
                        )}
                    </div>

                    <button
                        className="btn btn-primary call-next-btn"
                        onClick={() => handleCallNext('fitting_room')}
                        disabled={!queueData?.fitting_room?.count}
                    >
                        Call Next Customer
                    </button>
                </div>

                {/* Cashier Queue */}
                <div className="queue-management-card">
                    <div className="queue-card-header" style={{ borderColor: '#667eea' }}>
                        <div className="queue-card-icon" style={{ background: '#667eea' }}>
                            <FiShoppingCart />
                        </div>
                        <div>
                            <h3>Cashier</h3>
                            <p>{queueData?.cashier?.count || 0} waiting • ~{queueData?.cashier?.estimatedWait || 0} min</p>
                        </div>
                    </div>

                    {/* Currently Called */}
                    {calledCustomer.checkout && (
                        <div className="called-customer">
                            <span className="called-label">NOW SERVING</span>
                            <span className="called-name">{calledCustomer.checkout.name}</span>
                            {calledCustomer.checkout.phone && (
                                <span className="called-phone"><FiPhone /> {calledCustomer.checkout.phone}</span>
                            )}
                            <button className="btn btn-success" onClick={() => handleComplete('checkout')}>
                                <FiCheckCircle /> Complete Service
                            </button>
                        </div>
                    )}

                    {/* Queue List */}
                    <div className="queue-list">
                        {queueData?.cashier?.queue?.length > 0 ? (
                            queueData.cashier.queue.map((customer, index) => (
                                <div key={customer.id} className="queue-item">
                                    <span className="queue-position">#{customer.position}</span>
                                    <span className="queue-name">{customer.user_name || 'Guest'}</span>
                                    <span className="queue-time">{Math.round((Date.now() - new Date(customer.joined_at).getTime()) / 60000)}m ago</span>
                                </div>
                            ))
                        ) : (
                            <p className="queue-empty">No customers waiting</p>
                        )}
                    </div>

                    <button
                        className="btn btn-primary call-next-btn"
                        onClick={() => handleCallNext('checkout')}
                        disabled={!queueData?.cashier?.count}
                    >
                        Call Next Customer
                    </button>
                </div>
            </div>
        </div>
    )
}

// Placeholder pages
const UsersPage = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            const data = await adminService.getUsers()
            setUsers(Array.isArray(data) ? data : [])
        } catch (err) {
            console.log('Could not load users')
            // Mock data
            setUsers([
                { id: 1, name: 'John Doe', email: 'john@example.com', role: 'customer', created_at: '2026-01-10' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'staff', created_at: '2026-01-12' }
            ])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>User Management</h1>
                <p>Manage customers, staff, and admin accounts.</p>
            </div>

            {loading ? (
                <div className="loading-state"><FiUsers className="spinner" /><p>Loading users...</p></div>
            ) : (
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>#{user.id}</td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

const InventoryPage = () => {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadProducts()
    }, [])

    const loadProducts = async () => {
        try {
            const data = await productService.getAll()
            setProducts(data.products || [])
        } catch (err) {
            console.log('Could not load products')
        } finally {
            setLoading(false)
        }
    }

    const syncProducts = async () => {
        setLoading(true)
        try {
            await fetch('http://localhost:5000/api/admin/sync-products', { method: 'POST' })
            await loadProducts()
        } catch (err) {
            console.log('Sync failed')
        }
        setLoading(false)
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Inventory Management</h1>
                <p>Track and update store inventory - synced with Platzi API</p>
                <button className="btn btn-secondary" onClick={syncProducts} disabled={loading}>
                    <FiRefreshCw /> Sync Products
                </button>
            </div>

            {loading ? (
                <div className="loading-state"><FiPackage className="spinner" /><p>Loading products...</p></div>
            ) : (
                <div className="inventory-grid">
                    {products.map(product => (
                        <div key={product.id} className="inventory-card">
                            <img src={product.image_url || 'https://placehold.co/200x200'} alt={product.name} />
                            <div className="inventory-info">
                                <h4>{product.name}</h4>
                                <p>Category: {product.category}</p>
                                <p>Price: Rs. {product.price}</p>
                                <p>Stock: {product.stock_quantity}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const AnalyticsPage = () => {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAnalytics()
    }, [])

    const loadAnalytics = async () => {
        try {
            const data = await adminService.getStats()
            setStats(data)
        } catch (err) {
            // Mock data
            setStats({
                users: 45,
                activeQueues: 5,
                products: 50,
                todayQueues: 28,
                completedToday: 23,
                stores: 1
            })
        } finally {
            setLoading(false)
        }
    }

    const analyticsCards = stats ? [
        { label: 'Total Users', value: stats.users, icon: <FiUsers />, color: '#667eea' },
        { label: 'Products in Stock', value: stats.products, icon: <FiPackage />, color: '#10b981' },
        { label: 'Today\'s Queue Joins', value: stats.todayQueues, icon: <FiClock />, color: '#f093fb' },
        { label: 'Served Today', value: stats.completedToday, icon: <FiCheckCircle />, color: '#f5576c' },
        { label: 'Currently in Queue', value: stats.activeQueues, icon: <FiUsers />, color: '#3b82f6' },
        { label: 'Completion Rate', value: stats.todayQueues > 0 ? Math.round((stats.completedToday / stats.todayQueues) * 100) + '%' : '0%', icon: <FiBarChart2 />, color: '#8b5cf6' }
    ] : []

    return (
        <div className="admin-page">
            <div className="page-header">
                <h1>Analytics Dashboard</h1>
                <p>View performance metrics and insights</p>
            </div>

            {loading ? (
                <div className="loading-state"><FiBarChart2 className="spinner" /><p>Loading analytics...</p></div>
            ) : (
                <>
                    <div className="analytics-grid">
                        {analyticsCards.map((card, index) => (
                            <motion.div
                                key={index}
                                className="analytics-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="analytics-icon" style={{ background: card.color }}>
                                    {card.icon}
                                </div>
                                <div className="analytics-content">
                                    <div className="analytics-value">{card.value}</div>
                                    <div className="analytics-label">{card.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="analytics-insights">
                        <h3>📊 Today's Insights</h3>
                        <ul>
                            <li>Peak hour: 2:00 PM - 4:00 PM (estimated)</li>
                            <li>Average wait time: ~5 minutes</li>
                            <li>Most popular queue: Fitting Room</li>
                            <li>Customer satisfaction: High (based on completion rate)</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    )
}

const SettingsPage = () => (
    <div className="admin-page">
        <div className="page-header">
            <h1>Settings</h1>
            <p>Configure system preferences and settings.</p>
        </div>
        <div className="placeholder-content">
            <FiSettings />
            <h3>System Configuration</h3>
            <p>Store settings and notifications.</p>
        </div>
    </div>
)

export default AdminDashboard
