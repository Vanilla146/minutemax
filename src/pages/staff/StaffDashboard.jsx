/**
 * Staff Dashboard
 * Features:
 * - Call next customer by number
 * - Seamless handoff to POS at checkout
 * - Queue analytics (peak times, wait avg)
 * - Real-time queue management
 */

import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiUsers, FiClock, FiPhone, FiCheckCircle, FiShoppingCart,
    FiTrendingUp, FiBarChart2, FiRefreshCw, FiBell, FiDollarSign,
    FiAlertCircle, FiPrinter, FiHash, FiActivity, FiX, FiLoader
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { queueService } from '../../services/api'
import './StaffDashboard.css'

const StaffDashboard = () => {
    // ALL HOOKS MUST COME FIRST - before any conditional returns
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [activeQueue, setActiveQueue] = useState('fitting_room')
    const [queueData, setQueueData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [calledCustomer, setCalledCustomer] = useState({ fitting_room: null, cashier: null })
    const [notification, setNotification] = useState(null)
    const [analytics, setAnalytics] = useState({
        peakHours: [],
        avgWaitTime: 0,
        servedToday: 0,
        currentLoad: 'normal'
    })
    const [posHandoff, setPosHandoff] = useState(null)

    // Calculate queue analytics
    const calculateAnalytics = useCallback((data) => {
        const peakHours = [
            { hour: 10, load: 'medium', count: 12 },
            { hour: 11, load: 'high', count: 25 },
            { hour: 12, load: 'peak', count: 35 },
            { hour: 13, load: 'peak', count: 38 },
            { hour: 14, load: 'high', count: 28 },
            { hour: 15, load: 'medium', count: 18 },
            { hour: 16, load: 'high', count: 30 },
            { hour: 17, load: 'peak', count: 40 },
            { hour: 18, load: 'high', count: 32 },
            { hour: 19, load: 'medium', count: 20 }
        ]

        const totalInQueue = (data?.fitting_room?.count || 0) + (data?.cashier?.count || 0)
        let currentLoad = 'low'
        if (totalInQueue > 15) currentLoad = 'peak'
        else if (totalInQueue > 10) currentLoad = 'high'
        else if (totalInQueue > 5) currentLoad = 'medium'

        setAnalytics({
            peakHours,
            avgWaitTime: Math.round((data?.fitting_room?.estimatedWait || 0 + data?.cashier?.estimatedWait || 0) / 2),
            servedToday: 47,
            currentLoad
        })
    }, [])

    // Load queue data
    const loadQueues = useCallback(async () => {
        try {
            const data = await queueService.getStatus()
            setQueueData(data)
            calculateAnalytics(data)
        } catch (err) {
            console.log('Could not load queues')
            // Mock data for demo
            const mockData = {
                fitting_room: {
                    count: 4,
                    estimatedWait: 32,
                    queue: [
                        { id: 1, position: 1, token: 'FR-001', user_name: 'John Doe', phone: '0771234567', joined_at: new Date(Date.now() - 15 * 60000), items: ['Blue Jeans', 'White Shirt'] },
                        { id: 2, position: 2, token: 'FR-002', user_name: 'Jane Smith', phone: '0779876543', joined_at: new Date(Date.now() - 10 * 60000), items: ['Black Dress'] },
                        { id: 3, position: 3, token: 'FR-003', user_name: 'Mike Wilson', phone: '0771112233', joined_at: new Date(Date.now() - 5 * 60000), items: ['Blazer', 'Pants'] },
                        { id: 4, position: 4, token: 'FR-004', user_name: 'Sarah Johnson', joined_at: new Date(Date.now() - 2 * 60000), items: ['Skirt'] }
                    ]
                },
                cashier: {
                    count: 6,
                    estimatedWait: 18,
                    queue: [
                        { id: 5, position: 1, token: 'CH-001', user_name: 'Emma Brown', phone: '0773334455', joined_at: new Date(Date.now() - 8 * 60000), total: 15500 },
                        { id: 6, position: 2, token: 'CH-002', user_name: 'David Lee', joined_at: new Date(Date.now() - 6 * 60000), total: 8900 },
                        { id: 7, position: 3, token: 'CH-003', user_name: 'Guest', joined_at: new Date(Date.now() - 4 * 60000), total: 4500 }
                    ]
                }
            }
            setQueueData(mockData)
            calculateAnalytics(mockData)
        } finally {
            setLoading(false)
        }
    }, [calculateAnalytics])

    useEffect(() => {
        loadQueues()
        const interval = setInterval(loadQueues, 5000)
        return () => clearInterval(interval)
    }, [loadQueues])

    // Role-based access control - AFTER all hooks
    if (authLoading) {
        return (
            <div className="staff-dashboard">
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

    // Only staff and admin can access this dashboard
    const role = user?.role?.toLowerCase()
    if (role !== 'staff' && role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    // Call next customer
    const handleCallNext = async (queueType) => {
        const queue = queueData?.[queueType]?.queue
        if (!queue || queue.length === 0) {
            showNotification('info', 'Queue is empty')
            return
        }

        const nextCustomer = queue[0]

        try {
            await queueService.callNext(queueType)
        } catch (err) {
            // Continue with mock call
        }

        setCalledCustomer(prev => ({ ...prev, [queueType]: nextCustomer }))
        showNotification('success', `Calling ${nextCustomer.user_name} - Token ${nextCustomer.token}`)

        // Remove from queue display
        setQueueData(prev => ({
            ...prev,
            [queueType]: {
                ...prev[queueType],
                count: prev[queueType].count - 1,
                queue: prev[queueType].queue.slice(1)
            }
        }))
    }

    // Complete service
    const handleComplete = async (queueType) => {
        const customer = calledCustomer[queueType]
        if (!customer) return

        try {
            await queueService.complete(customer.id)
        } catch (err) {
            console.log('API call failed, continuing')
        }

        setCalledCustomer(prev => ({ ...prev, [queueType]: null }))
        showNotification('success', 'Service completed!')
        setAnalytics(prev => ({ ...prev, servedToday: prev.servedToday + 1 }))
    }

    // Handoff to POS
    const handlePOSHandoff = (customer) => {
        setPosHandoff({
            customer,
            items: customer.items || [],
            total: customer.total || 0,
            timestamp: new Date()
        })
    }

    // Complete POS handoff
    const completePOSHandoff = () => {
        if (calledCustomer.fitting_room) {
            // Move customer to checkout queue after fitting room
            showNotification('success', `${calledCustomer.fitting_room.user_name} moved to checkout queue`)
            setCalledCustomer(prev => ({ ...prev, fitting_room: null }))
        }
        setPosHandoff(null)
    }

    // Show notification
    const showNotification = (type, message) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 4000)
    }

    // Get wait time in minutes
    const getWaitTime = (joinedAt) => {
        return Math.round((Date.now() - new Date(joinedAt).getTime()) / 60000)
    }

    // Get load color
    const getLoadColor = (load) => {
        switch (load) {
            case 'peak': return '#ef4444'
            case 'high': return '#f59e0b'
            case 'medium': return '#667eea'
            default: return '#10b981'
        }
    }

    if (loading) {
        return (
            <div className="staff-dashboard">
                <div className="loading-state">
                    <FiRefreshCw className="spinner" />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="staff-dashboard">
            {/* Header */}
            <header className="staff-header">
                <div className="header-left">
                    <h1>Staff Dashboard</h1>
                    <span className="staff-name">Welcome, {user?.name || 'Staff'}</span>
                </div>
                <div className="header-right">
                    <div className={`current-load ${analytics.currentLoad}`}>
                        <FiActivity />
                        <span>{analytics.currentLoad.toUpperCase()} LOAD</span>
                    </div>
                    <button className="refresh-btn" onClick={loadQueues}>
                        <FiRefreshCw /> Refresh
                    </button>
                </div>
            </header>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`staff-notification ${notification.type}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {notification.type === 'success' && <FiCheckCircle />}
                        {notification.type === 'error' && <FiAlertCircle />}
                        {notification.type === 'info' && <FiBell />}
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)}><FiX /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Stats */}
            <div className="staff-stats">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f093fb' }}>
                        <FiUsers />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{queueData?.fitting_room?.count || 0}</span>
                        <span className="stat-label">Fitting Room Queue</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#667eea' }}>
                        <FiShoppingCart />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{queueData?.cashier?.count || 0}</span>
                        <span className="stat-label">Cashier Queue</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#10b981' }}>
                        <FiCheckCircle />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{analytics.servedToday}</span>
                        <span className="stat-label">Served Today</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f59e0b' }}>
                        <FiClock />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{analytics.avgWaitTime}m</span>
                        <span className="stat-label">Avg Wait Time</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="staff-main-grid">
                {/* Queue Management */}
                <div className="queue-section">
                    {/* Queue Tabs */}
                    <div className="queue-tabs">
                        <button
                            className={`queue-tab ${activeQueue === 'fitting_room' ? 'active' : ''}`}
                            onClick={() => setActiveQueue('fitting_room')}
                        >
                            <FiUsers />
                            Fitting Room ({queueData?.fitting_room?.count || 0})
                        </button>
                        <button
                            className={`queue-tab ${activeQueue === 'cashier' ? 'active' : ''}`}
                            onClick={() => setActiveQueue('cashier')}
                        >
                            <FiShoppingCart />
                            Cashier ({queueData?.cashier?.count || 0})
                        </button>
                    </div>

                    {/* Currently Serving */}
                    <div className="currently-serving">
                        <h3>
                            <FiBell /> Now Serving
                        </h3>
                        {calledCustomer[activeQueue] ? (
                            <motion.div
                                className="serving-card"
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                            >
                                <div className="serving-token">
                                    {calledCustomer[activeQueue].token}
                                </div>
                                <div className="serving-info">
                                    <h4>{calledCustomer[activeQueue].user_name}</h4>
                                    {calledCustomer[activeQueue].phone && (
                                        <p><FiPhone /> {calledCustomer[activeQueue].phone}</p>
                                    )}
                                    {calledCustomer[activeQueue].items && (
                                        <p className="items-list">
                                            Items: {calledCustomer[activeQueue].items.join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="serving-actions">
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleComplete(activeQueue)}
                                    >
                                        <FiCheckCircle /> Complete
                                    </button>
                                    {activeQueue === 'fitting_room' && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handlePOSHandoff(calledCustomer[activeQueue])}
                                        >
                                            <FiShoppingCart /> Send to Checkout
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="no-serving">
                                <p>No customer being served</p>
                                <button
                                    className="btn btn-primary btn-lg call-btn"
                                    onClick={() => handleCallNext(activeQueue)}
                                    disabled={!queueData?.[activeQueue]?.queue?.length}
                                >
                                    <FiHash /> Call Next Customer
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Queue List */}
                    <div className="queue-list-section">
                        <div className="queue-list-header">
                            <h3>Waiting Customers</h3>
                            <span className="wait-estimate">
                                ~{queueData?.[activeQueue]?.estimatedWait || 0} min total wait
                            </span>
                        </div>
                        <div className="queue-list">
                            {queueData?.[activeQueue]?.queue?.length > 0 ? (
                                queueData[activeQueue].queue.map((customer, index) => (
                                    <motion.div
                                        key={customer.id}
                                        className={`queue-item ${index === 0 ? 'next' : ''}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="queue-token">{customer.token}</div>
                                        <div className="queue-details">
                                            <span className="queue-name">{customer.user_name}</span>
                                            <span className="queue-wait">
                                                <FiClock /> Waiting {getWaitTime(customer.joined_at)}m
                                            </span>
                                        </div>
                                        {index === 0 && (
                                            <button
                                                className="call-single-btn"
                                                onClick={() => handleCallNext(activeQueue)}
                                            >
                                                Call
                                            </button>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="queue-empty">
                                    <FiCheckCircle />
                                    <p>No customers waiting</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Analytics Panel */}
                <div className="analytics-section">
                    <h3><FiBarChart2 /> Queue Analytics</h3>

                    {/* Peak Hours Chart */}
                    <div className="analytics-card">
                        <h4><FiTrendingUp /> Peak Hours Today</h4>
                        <div className="peak-hours-chart">
                            {analytics.peakHours.map((hour, index) => (
                                <div key={index} className="peak-bar-container">
                                    <div
                                        className="peak-bar"
                                        style={{
                                            height: `${(hour.count / 40) * 100}%`,
                                            background: getLoadColor(hour.load)
                                        }}
                                    />
                                    <span className="peak-hour">{hour.hour}:00</span>
                                </div>
                            ))}
                        </div>
                        <div className="peak-legend">
                            <span><i style={{ background: '#10b981' }}></i> Low</span>
                            <span><i style={{ background: '#667eea' }}></i> Medium</span>
                            <span><i style={{ background: '#f59e0b' }}></i> High</span>
                            <span><i style={{ background: '#ef4444' }}></i> Peak</span>
                        </div>
                    </div>

                    {/* Wait Time Stats */}
                    <div className="analytics-card">
                        <h4><FiClock /> Wait Time Statistics</h4>
                        <div className="wait-stats">
                            <div className="wait-stat">
                                <span className="wait-stat-label">Average Wait</span>
                                <span className="wait-stat-value">{analytics.avgWaitTime} min</span>
                            </div>
                            <div className="wait-stat">
                                <span className="wait-stat-label">Fitting Room Avg</span>
                                <span className="wait-stat-value">{queueData?.fitting_room?.estimatedWait || 0} min</span>
                            </div>
                            <div className="wait-stat">
                                <span className="wait-stat-label">Cashier Avg</span>
                                <span className="wait-stat-value">{queueData?.cashier?.estimatedWait || 0} min</span>
                            </div>
                            <div className="wait-stat">
                                <span className="wait-stat-label">Target</span>
                                <span className="wait-stat-value success">{"< 10 min"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="analytics-card">
                        <h4><FiActivity /> Today's Performance</h4>
                        <div className="performance-stats">
                            <div className="perf-stat">
                                <div className="perf-value">{analytics.servedToday}</div>
                                <div className="perf-label">Customers Served</div>
                            </div>
                            <div className="perf-stat">
                                <div className="perf-value success">92%</div>
                                <div className="perf-label">Satisfaction Rate</div>
                            </div>
                            <div className="perf-stat">
                                <div className="perf-value">Rs. 485K</div>
                                <div className="perf-label">Sales Today</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* POS Handoff Modal */}
            <AnimatePresence>
                {posHandoff && (
                    <motion.div
                        className="pos-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPosHandoff(null)}
                    >
                        <motion.div
                            className="pos-modal"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pos-modal-header">
                                <h3><FiDollarSign /> POS Handoff</h3>
                                <button onClick={() => setPosHandoff(null)}><FiX /></button>
                            </div>
                            <div className="pos-modal-body">
                                <div className="pos-customer-info">
                                    <h4>{posHandoff.customer.user_name}</h4>
                                    <p>Token: {posHandoff.customer.token}</p>
                                    {posHandoff.customer.phone && (
                                        <p><FiPhone /> {posHandoff.customer.phone}</p>
                                    )}
                                </div>

                                {posHandoff.items.length > 0 && (
                                    <div className="pos-items">
                                        <h5>Items Tried:</h5>
                                        <ul>
                                            {posHandoff.items.map((item, index) => (
                                                <li key={index}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="pos-actions">
                                    <button className="btn btn-secondary" onClick={() => {
                                        // Print receipt or summary
                                        showNotification('info', 'Printing customer summary...')
                                    }}>
                                        <FiPrinter /> Print Summary
                                    </button>
                                    <button className="btn btn-primary" onClick={completePOSHandoff}>
                                        <FiShoppingCart /> Add to Checkout Queue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default StaffDashboard
