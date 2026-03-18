import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiChevronDown, FiSettings } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import LanguageSelector from '../LanguageSelector'
import './Navbar.css'

const Navbar = () => {
    const { t } = useTranslation()
    const { isAuthenticated, user, logout } = useAuth()
    const navigate = useNavigate()
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        setIsMobileMenuOpen(false)
        setIsProfileDropdownOpen(false)
    }, [location])

    const handleLogout = () => {
        logout()
        setIsProfileDropdownOpen(false)
        navigate('/')
    }

    const navLinks = [
        { path: '/', label: t('nav.home') },
        { path: '/queue', label: t('nav.queue') },
        { path: '/outfit-match', label: t('nav.outfitMatch') },
        { path: '/dashboard', label: t('nav.dashboard') },
    ]

    return (
        <motion.nav
            className={`navbar ${isScrolled ? 'scrolled' : ''}`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        >
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon">
                        <FiGrid />
                    </div>
                    <span className="logo-text">
                        Minute<span className="logo-accent">Max</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        >
                            {link.label}
                            {location.pathname === link.path && (
                                <motion.div
                                    className="nav-link-indicator"
                                    layoutId="navIndicator"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>

                {/* Auth Buttons & Language */}
                <div className="navbar-actions">
                    <LanguageSelector variant="compact" />
                    
                    {isAuthenticated ? (
                        <div className="user-profile-dropdown">
                            <button 
                                className="profile-trigger"
                                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                            >
                                <div className="profile-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || <FiUser />}
                                </div>
                                <span className="profile-name">{user?.name || 'User'}</span>
                                <FiChevronDown className={`dropdown-arrow ${isProfileDropdownOpen ? 'open' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {isProfileDropdownOpen && (
                                    <motion.div
                                        className="profile-dropdown-menu"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="dropdown-header">
                                            <span className="dropdown-email">{user?.email}</span>
                                            <span className="dropdown-role">{user?.role || 'Customer'}</span>
                                        </div>
                                        <div className="dropdown-divider"></div>
                                        <Link to="/dashboard" className="dropdown-item">
                                            <FiUser /> My Dashboard
                                        </Link>
                                        {(user?.role === 'staff' || user?.role === 'admin') && (
                                            <Link to="/staff" className="dropdown-item">
                                                <FiGrid /> Staff Panel
                                            </Link>
                                        )}
                                        {user?.role === 'admin' && (
                                            <Link to="/admin" className="dropdown-item">
                                                <FiSettings /> Admin Panel
                                            </Link>
                                        )}
                                        <div className="dropdown-divider"></div>
                                        <button className="dropdown-item logout" onClick={handleLogout}>
                                            <FiLogOut /> Logout
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="nav-auth-link">
                                <FiUser />
                                <span>{t('nav.login')}</span>
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                {t('landing.hero.cta')}
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-toggle"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {isMobileMenuOpen ? <FiX /> : <FiMenu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        className="mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mobile-menu-content">
                            {navLinks.map((link, index) => (
                                <motion.div
                                    key={link.path}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link
                                        to={link.path}
                                        className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                                    >
                                        {link.label}
                                    </Link>
                                </motion.div>
                            ))}

                            {/* Mobile Language Selector */}
                            <div className="mobile-language-selector">
                                <LanguageSelector variant="settings" />
                            </div>

                            <div className="mobile-auth-buttons">
                                {isAuthenticated ? (
                                    <>
                                        <div className="mobile-user-info">
                                            <div className="mobile-avatar">
                                                {user?.name?.charAt(0).toUpperCase() || <FiUser />}
                                            </div>
                                            <div className="mobile-user-details">
                                                <span className="mobile-user-name">{user?.name}</span>
                                                <span className="mobile-user-email">{user?.email}</span>
                                            </div>
                                        </div>
                                        <Link to="/dashboard" className="btn btn-secondary">
                                            <FiUser /> Dashboard
                                        </Link>
                                        {user?.role === 'admin' && (
                                            <Link to="/admin" className="btn btn-secondary">
                                                <FiSettings /> Admin
                                            </Link>
                                        )}
                                        <button className="btn btn-outline logout-btn" onClick={handleLogout}>
                                            <FiLogOut /> Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" className="btn btn-secondary">{t('nav.login')}</Link>
                                        <Link to="/register" className="btn btn-primary">{t('landing.hero.cta')}</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    )
}

export default Navbar

