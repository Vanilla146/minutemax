/**
 * Language Selector Component
 * Allows users to switch between English, Sinhala, and Tamil
 */

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiGlobe, FiChevronDown, FiCheck } from 'react-icons/fi'
import { LANGUAGES, changeLanguage, getCurrentLanguage } from '../i18n'
import './LanguageSelector.css'

const LanguageSelector = ({ variant = 'default' }) => {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [currentLang, setCurrentLang] = useState(getCurrentLanguage())
    const dropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode)
        setCurrentLang(langCode)
        setIsOpen(false)
    }

    const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

    return (
        <div className={`language-selector ${variant}`} ref={dropdownRef}>
            <button
                className="language-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('settings.selectLanguage')}
            >
                <FiGlobe className="globe-icon" />
                <span className="current-lang">
                    {variant === 'compact' ? currentLanguage.code.toUpperCase() : currentLanguage.nativeName}
                </span>
                <FiChevronDown className={`chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="language-dropdown">
                    <div className="dropdown-header">
                        {t('settings.selectLanguage')}
                    </div>
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            className={`language-option ${currentLang === lang.code ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            <span className="lang-flag">{lang.flag}</span>
                            <div className="lang-info">
                                <span className="lang-native">{lang.nativeName}</span>
                                <span className="lang-name">{lang.name}</span>
                            </div>
                            {currentLang === lang.code && <FiCheck className="check-icon" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default LanguageSelector
