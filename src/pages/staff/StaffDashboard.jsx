/**
 * Staff Dashboard - Redesigned
 */

import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiUsers, FiClock, FiPhone, FiCheckCircle, FiShoppingCart,
    FiTrendingUp, FiBarChart2, FiRefreshCw, FiBell, FiDollarSign,
    FiAlertCircle, FiPrinter, FiHash, FiActivity, FiX, FiLoader,
    FiZap, FiArrowUp, FiArrowDown, FiMinus
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { queueService } from '../../services/api'
import './StaffDashboard.css'

const StaffDashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const [activeQueue, setActiveQueue] = useState('fitting_room')
    const [queueData, setQueueData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [calledCustomer, setCalledCustomer] = useState({ fitting_room: null, cashier: null })
    const [notification, setNotification] = useState(null)
    const [analytics, setAnalytics] = useState({
        peakHours: [],
        avgWaitTime: 0,
        servedToday: 0,
        currentLoad: 'normal'
    })
    const [posHandoff, setPosHandoff] = useState(null)

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
            avgWaitTime: Math.round(((data?.fitting_room?.estimatedWait || 0) + (data?.cashier?.estimatedWait || 0)) / 2),
            servedToday: 47,
            currentLoad
        })
    }, [])

    const loadQueues = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const data = await queueService.getStatus()
            setQueueData(data)
            calculateAnalytics(data)
        } catch (err) {
            const mockData = {
                fitting_room: {
                    count: 4, estimatedWait: 32,
                    queue: [
                        { id: 1, position: 1, token: 'F001', user_name: 'John Doe', phone: '0771234567', joined_at: new Date(Date.now() - 15 * 60000), items: ['Blue Jeans', 'White Shirt'] },
                        { id: 2, position: 2, token: 'F002', user_name: 'Jane Smith', phone: '0779876543', joined_at: new Date(Date.now() - 10 * 60000), items: ['Black Dress'] },
                        { id: 3, position: 3, token: 'F003', user_name: 'Mike Wilson', joined_at: new Date(Date.now() - 5 * 60000), items: ['Blazer'] },
                        { id: 4, position: 4, token: 'F004', user_name: 'Sarah Johnson', joined_at: new Date(Date.now() - 2 * 60000), items: ['Skirt'] }
                    ]
                },
                cashier: {
                    count: 3, estimatedWait: 9,
                    queue: [
                        { id: 5, position: 1, token: 'C001', user_name: 'Emma Brown', phone: '0773334455', joined_at: new Date(Date.now() - 8 * 60000), total: 15500 },
                        { id: 6, position: 2, token: 'C002', user_name: 'David Lee', joined_at: new Date(Date.now() - 6 * 60000), total: 8900 },
                        { id: 7, position: 3, token: 'C003', user_name: 'Guest', joined_at: new Date(Date.now() - 4 * 60000), total: 4500 }
                    ]
                }
            }
            setQueueData(mockData)
            calculateAnalytics(mockData)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [calculateAnalytics])

    useEffect(() => {
        loadQueues()
        const interval = setInterval(() => loadQueues(), 10000)
        return () => clearInterval(interval)
    }, [loadQueues])

    if (authLoading) return <div className="staff-dashboard"><div className="loading-state"><FiLoader className="spinner" /><p>Loading...</p></div></div>
    if (!isAuthenticated) return <Navigate to="/login" replace />
    const role = user?.role?.toLowerCase()
    if (role !== 'staff' && role !== 'admin') return <Navigate to="/dashboard" replace />

    const handleCallNext = async (queueType) => {
        const queue = queueData?.[queueType]?.queue
        if (!queue || queue.length === 0) { showNotification('info', 'Queue is empty'); return }
        const nextCustomer = queue[0]
        try { await queueService.callNext(queueType) } catch (err) {}
        setCalledCustomer(prev => ({ ...prev, [queueType]: nextCustomer }))
        showNotification('success', `Calling ${nextCustomer.user_name} — Token ${nextCustomer.token}`)
        setQueueData(prev => ({
            ...prev,
            [queueType]: { ...prev[queueType], count: prev[queueType].count - 1, queue: prev[queueType].queue.slice(1) }
        }))
    }

    const handleComplete = async (queueType) => {
        const customer = calledCustomer[queueType]
        if (!customer) return
        try { await queueService.complete(customer.id) } catch (err) {}
        setCalledCustomer(prev => ({ ...prev, [queueType]: null }))
        showNotification('success', 'Service completed!')
        setAnalytics(prev => ({ ...prev, servedToday: prev.servedToday + 1 }))
    }

    const handlePOSHandoff = (customer) => {
        setPosHandoff({ customer, items: customer.items || [], total: customer.total || 0, timestamp: new Date() })
    }

    const completePOSHandoff = () => {
        if (calledCustomer.fitting_room) {
            showNotification('success', `${calledCustomer.fitting_room.user_name} moved to checkout queue`)
            setCalledCustomer(prev => ({ ...prev, fitting_room: null }))
        }
        setPosHandoff(null)
    }

    const showNotification = (type, message) => {
        setNotification({ type, message })
        setTimeout(() => setNotification(null), 4000)
    }

    const getWaitTime = (joinedAt) => Math.round((Date.now() - new Date(joinedAt).getTime()) / 60000)

    const getLoadColor = (load) => {
        switch (load) {
            case 'peak': return '#ef4444'
            case 'high': return '#f59e0b'
            case 'medium': return '#667eea'
            default: return '#10b981'
        }
    }

    const getLoadBadgeClass = (load) => {
        switch (load) {
            case 'peak': return 'load-peak'
            case 'high': return 'load-high'
            case 'medium': return 'load-medium'
            default: return 'load-low'
        }
    }

    const currentQueue = queueData?.[activeQueue]
    const maxBarCount = Math.max(...analytics.peakHours.map(h => h.count), 1)

    if (loading) return (
        <div className="staff-dashboard">
            <div className="loading-state"><FiRefreshCw className="spinner" /><p>Loading dashboard...</p></div>
        </div>
    )

    return (
        <div className="staff-dashboard">

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`staff-toast ${notification.type}`}
                        initial={{ opacity: 0, y: -60, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -60, x: '-50%' }}
                    >
                        {notification.type === 'success' && <FiCheckCircle />}
                        {notification.type === 'error' && <FiAlertCircle />}
                        {notification.type === 'info' && <FiBell />}
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)}><FiX /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="staff-header">
                <div className="header-left">
                    <div className="header-title">
                        <h1>Staff Dashboard</h1>
                        <span className={`load-badge ${getLoadBadgeClass(analytics.currentLoad)}`}>
                            <FiActivity /> {analytics.currentLoad.toUpperCase()} LOAD
                        </span>
                    </div>
                    <p>Welcome back, <strong>{user?.name || 'Staff'}</strong> · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="header-right">
                    <button className={`refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={() => loadQueues(true)}>
                        <FiRefreshCw /> {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </header>

            {/* KPI Stats Row */}
            <div className="kpi-row">
                {[
                    { icon: <FiUsers />, value: queueData?.fitting_room?.count || 0, label: 'Fitting Room', sub: `~${queueData?.fitting_room?.estimatedWait || 0} min wait`, color: '#f093fb', bg: '#fdf4ff' },
                    { icon: <FiShoppingCart />, value: queueData?.cashier?.count || 0, label: 'Cashier Queue', sub: `~${queueData?.cashier?.estimatedWait || 0} min wait`, color: '#667eea', bg: '#f0f3ff' },
                    { icon: <FiCheckCircle />, value: analytics.servedToday, label: 'Served Today', sub: '+12% vs yesterday', color: '#10b981', bg: '#f0fdf4' },
                    { icon: <FiClock />, value: `${analytics.avgWaitTime}m`, label: 'Avg Wait', sub: 'Target: < 10 min', color: '#f59e0b', bg: '#fffbeb' },
                    { icon: <FiDollarSign />, value: 'Rs.485K', label: 'Sales Today', sub: '92% satisfaction', color: '#ef4444', bg: '#fef2f2' },
                ].map((kpi, i) => (
                    <motion.div
                        key={i}
                        className="kpi-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>{kpi.icon}</div>
                        <div className="kpi-info">
                            <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
                            <div className="kpi-label">{kpi.label}</div>
                            <div className="kpi-sub">{kpi.sub}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="staff-main-grid">

                {/* Left: Queue Management */}
                <div className="queue-panel">

                    {/* Queue Tabs */}
                    <div className="queue-tabs">
                        <button
                            className={`queue-tab ${activeQueue === 'fitting_room' ? 'active' : ''}`}
                            onClick={() => setActiveQueue('fitting_room')}
                        >
                            <FiUsers />
                            <span>Fitting Room</span>
                            <span className="tab-count">{queueData?.fitting_room?.count || 0}</span>
                        </button>
                        <button
                            className={`queue-tab ${activeQueue === 'cashier' ? 'active' : ''}`}
                            onClick={() => setActiveQueue('cashier')}
                        >
                            <FiShoppingCart />
                            <span>Cashier</span>
                            <span className="tab-count">{queueData?.cashier?.count || 0}</span>
                        </button>
                    </div>

                    {/* Now Serving */}
                    <div className="serving-section">
                        <div className="section-label-row">
                            <span className="section-label"><FiBell /> NOW SERVING</span>
                            {!calledCustomer[activeQueue] && (
                                <span className="queue-wait-info">~{currentQueue?.estimatedWait || 0} min total wait</span>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {calledCustomer[activeQueue] ? (
                                <motion.div
                                    key="serving"
                                    className="serving-card active"
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                >
                                    <div className="serving-left">
                                        <div className="serving-token">{calledCustomer[activeQueue].token}</div>
                                        <div className="serving-pulse" />
                                    </div>
                                    <div className="serving-info">
                                        <h4>{calledCustomer[activeQueue].user_name}</h4>
                                        {calledCustomer[activeQueue].phone && (
                                            <p><FiPhone /> {calledCustomer[activeQueue].phone}</p>
                                        )}
                                        {calledCustomer[activeQueue].items?.length > 0 && (
                                            <p className="items-list">🛍 {calledCustomer[activeQueue].items.join(', ')}</p>
                                        )}
                                    </div>
                                    <div className="serving-actions">
                                        <button className="btn-complete" onClick={() => handleComplete(activeQueue)}>
                                            <FiCheckCircle /> Complete
                                        </button>
                                        {activeQueue === 'fitting_room' && (
                                            <button className="btn-handoff" onClick={() => handlePOSHandoff(calledCustomer[activeQueue])}>
                                                <FiShoppingCart /> Checkout
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty-serving"
                                    className="serving-card empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <p>No customer being served</p>
                                    <button
    className="btn-call-next"
    onClick={() => handleCallNext(activeQueue)}
    disabled={!currentQueue?.queue?.length || !!calledCustomer[activeQueue]}
>
                                        <FiHash /> Call Next Customer
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Waiting List */}
                    <div className="waiting-section">
                        <div className="section-label-row">
                            <span className="section-label"><FiUsers /> WAITING CUSTOMERS</span>
                            <span className="queue-count-badge">{currentQueue?.count || 0} in queue</span>
                        </div>
                        <div className="queue-list">
                            <AnimatePresence>
                                {currentQueue?.queue?.length > 0 ? currentQueue.queue.map((customer, index) => (
                                    <motion.div
                                        key={customer.id}
                                        className={`queue-item ${index === 0 ? 'next-up' : ''}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.04 }}
                                    >
                                        <div className="queue-pos-badge" style={{ background: index === 0 ? '#171717' : '#f5f5f5', color: index === 0 ? '#fff' : '#676869' }}>
                                            #{customer.position}
                                        </div>
                                        <div className="queue-token-small">{customer.token}</div>
                                        <div className="queue-details">
                                            <span className="queue-name">{customer.user_name || 'Guest'}</span>
                                            <span className="queue-wait-time"><FiClock /> {getWaitTime(customer.joined_at)}m ago</span>
                                        </div>
                                        {index === 0 && (
                                            <button
    className="btn-call-inline"
    onClick={() => handleCallNext(activeQueue)}
    disabled={!!calledCustomer[activeQueue]}
    style={{ opacity: calledCustomer[activeQueue] ? 0.4 : 1, cursor: calledCustomer[activeQueue] ? 'not-allowed' : 'pointer' }}
>
    Call
</button>
                                        )}
                                    </motion.div>
                                )) : (
                                    <div className="queue-empty-state">
                                        <FiCheckCircle />
                                        <p>All clear — no customers waiting</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Right: Analytics */}
                <div className="analytics-panel">

                    {/* Peak Hours Bar Chart */}
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <div className="analytics-card-title">
                                <FiTrendingUp />
                                <span>Peak Hours Today</span>
                            </div>
                            <button className="mini-refresh-btn" onClick={() => loadQueues(true)}>
                                <FiRefreshCw />
                            </button>
                        </div>
                        <div className="peak-chart">
                            {analytics.peakHours.map((hour, i) => (
                                <div key={i} className="peak-col">
                                    <div className="peak-bar-wrap">
                                        <div
                                            className="peak-bar-fill"
                                            style={{
                                                height: `${(hour.count / maxBarCount) * 100}%`,
                                                background: getLoadColor(hour.load)
                                            }}
                                            title={`${hour.count} customers`}
                                        />
                                    </div>
                                    <span className="peak-hour-label">{hour.hour}</span>
                                </div>
                            ))}
                        </div>
                        <div className="peak-legend">
                            {[['#10b981', 'Low'], ['#667eea', 'Medium'], ['#f59e0b', 'High'], ['#ef4444', 'Peak']].map(([color, label]) => (
                                <span key={label} className="legend-item">
                                    <span className="legend-dot" style={{ background: color }} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Wait Time Stats */}
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <div className="analytics-card-title">
                                <FiClock />
                                <span>Wait Time Statistics</span>
                            </div>
                            <button className="mini-refresh-btn" onClick={() => loadQueues(true)}>
                                <FiRefreshCw />
                            </button>
                        </div>
                        <div className="wait-stats-grid">
                            {[
                                { label: 'Avg Wait', value: `${analytics.avgWaitTime} min`, icon: <FiMinus />, color: '#667eea' },
                                { label: 'Fitting Room', value: `${queueData?.fitting_room?.estimatedWait || 0} min`, icon: <FiArrowUp />, color: '#f093fb' },
                                { label: 'Cashier', value: `${queueData?.cashier?.estimatedWait || 0} min`, icon: <FiArrowDown />, color: '#667eea' },
                                { label: 'Target', value: '< 10 min', icon: <FiZap />, color: '#10b981' },
                            ].map((s, i) => (
                                <div key={i} className="wait-stat-box">
                                    <div className="wait-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                                    <div className="wait-stat-value" style={{ color: s.color }}>{s.value}</div>
                                    <div className="wait-stat-label">{s.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="analytics-card">
                        <div className="analytics-card-header">
                            <div className="analytics-card-title">
                                <FiActivity />
                                <span>Today's Performance</span>
                            </div>
                            <button className="mini-refresh-btn" onClick={() => loadQueues(true)}>
                                <FiRefreshCw />
                            </button>
                        </div>
                        <div className="perf-grid">
                            <div className="perf-main">
                                <div className="perf-big-value">{analytics.servedToday}</div>
                                <div className="perf-big-label">Customers Served</div>
                                <div className="perf-progress-bar">
                                    <div className="perf-progress-fill" style={{ width: '78%' }} />
                                </div>
                                <div className="perf-progress-label">78% of daily target</div>
                            </div>
                            <div className="perf-side">
                                <div className="perf-mini-stat">
                                    <span className="perf-mini-value" style={{ color: '#10b981' }}>92%</span>
                                    <span className="perf-mini-label">Satisfaction</span>
                                </div>
                                <div className="perf-mini-stat">
                                    <span className="perf-mini-value" style={{ color: '#667eea' }}>Rs.485K</span>
                                    <span className="perf-mini-label">Sales Today</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* POS Modal */}
            <AnimatePresence>
                {posHandoff && (
                    <motion.div className="pos-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPosHandoff(null)}>
                        <motion.div className="pos-modal" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
                            <div className="pos-modal-header">
                                <h3><FiDollarSign /> POS Handoff</h3>
                                <button onClick={() => setPosHandoff(null)}><FiX /></button>
                            </div>
                            <div className="pos-modal-body">
                                <div className="pos-customer-info">
                                    <h4>{posHandoff.customer.user_name}</h4>
                                    <p>Token: {posHandoff.customer.token}</p>
                                    {posHandoff.customer.phone && <p><FiPhone /> {posHandoff.customer.phone}</p>}
                                </div>
                                {posHandoff.items.length > 0 && (
                                    <div className="pos-items">
                                        <h5>Items Tried:</h5>
                                        <ul>{posHandoff.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                    </div>
                                )}
                                <div className="pos-actions">
                                    <button className="btn btn-secondary" onClick={() => showNotification('info', 'Printing summary...')}><FiPrinter /> Print Summary</button>
                                    <button className="btn btn-primary" onClick={completePOSHandoff}><FiShoppingCart /> Send to Checkout</button>
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
