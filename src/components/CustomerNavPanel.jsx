/**
 * Customer Navigation Panel
 * Provides quick access to all customer features
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
    FiHome, FiUsers, FiCamera, FiUser, FiHeart,
    FiClock, FiSettings, FiGrid, FiChevronLeft,
    FiChevronRight, FiShoppingBag, FiGlobe
} from 'react-icons/fi'
import LanguageSelector from './LanguageSelector'
import './CustomerNavPanel.css'

const CustomerNavPanel = ({ collapsed = false, onToggle }) => {
    const { t } = useTranslation()
    const location = useLocation()
    const [isCollapsed, setIsCollapsed] = useState(collapsed)

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed)
        onToggle?.(!isCollapsed)
    }

    const navItems = [
        {
            path: '/',
            icon: <FiHome />,
            label: t('nav.home'),
            description: 'Back to home'
        },
        {
            path: '/queue',
            icon: <FiUsers />,
            label: t('nav.queue'),
            description: 'Join queue',
            badge: 'Live'
        },
        {
            path: '/outfit-match',
            icon: <FiCamera />,
            label: t('nav.outfitMatch'),
            description: 'AI matching',
            badge: 'AI'
        },
        {
            path: '/dashboard',
            icon: <FiUser />,
            label: t('nav.dashboard'),
            description: 'Your account'
        },
    ]

    const quickActions = [
        { path: '/dashboard?tab=history', icon: <FiClock />, label: t('dashboard.queueHistory') },
        { path: '/dashboard?tab=outfits', icon: <FiHeart />, label: t('dashboard.savedItems') },
        { path: '/dashboard?tab=settings', icon: <FiSettings />, label: t('nav.settings') },
    ]

    return (
        <motion.aside
            className={`customer-nav-panel ${isCollapsed ? 'collapsed' : ''}`}
            animate={{ width: isCollapsed ? 70 : 260 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Logo */}
            <div className="nav-panel-header">
                <Link to="/" className="nav-panel-logo">
                    <div className="logo-icon">
                        <FiGrid />
                    </div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                className="logo-text"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                Minute<span className="accent">Max</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Link>
                <button className="collapse-btn" onClick={toggleCollapse}>
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            {/* Main Navigation */}
            <nav className="nav-panel-main">
                <div className="nav-section-label">
                    {!isCollapsed && 'Main Menu'}
                </div>
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-panel-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <div className="nav-item-icon">{item.icon}</div>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    className="nav-item-content"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                >
                                    <span className="nav-item-label">{item.label}</span>
                                    {item.description && (
                                        <span className="nav-item-desc">{item.description}</span>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {item.badge && !isCollapsed && (
                            <span className={`nav-item-badge ${item.badge.toLowerCase()}`}>
                                {item.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </nav>

            {/* Quick Actions */}
            <div className="nav-panel-quick">
                <div className="nav-section-label">
                    {!isCollapsed && 'Quick Access'}
                </div>
                {quickActions.map(action => (
                    <Link
                        key={action.path}
                        to={action.path}
                        className="nav-panel-quick-item"
                    >
                        {action.icon}
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {action.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                ))}
            </div>

            {/* Language Selector */}
            <div className="nav-panel-footer">
                {!isCollapsed ? (
                    <LanguageSelector variant="settings" />
                ) : (
                    <button className="nav-panel-lang-btn">
                        <FiGlobe />
                    </button>
                )}
            </div>
        </motion.aside>
    )
}

export default CustomerNavPanel
