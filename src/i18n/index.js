/**
 * i18n Configuration for MinuteMax
 * Supports: English (en), Sinhala (si), Tamil (ta)
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import en from './locales/en.json'
import si from './locales/si.json'
import ta from './locales/ta.json'

const resources = {
    en: { translation: en },
    si: { translation: si },
    ta: { translation: ta }
}

// Language metadata
export const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: 'GB' },
    { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: 'LK' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: 'LK' }
]

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false // React already escapes
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'minutemax_language'
        }
    })

/**
 * Change language and persist to localStorage
 * @param {string} langCode - Language code (en, si, ta)
 */
export const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('minutemax_language', langCode)
}

/**
 * Get current language
 * @returns {string} Current language code
 */
export const getCurrentLanguage = () => {
    return i18n.language || 'en'
}

/**
 * Get language name by code
 * @param {string} code - Language code
 * @returns {object} Language object
 */
export const getLanguageByCode = (code) => {
    return LANGUAGES.find(lang => lang.code === code) || LANGUAGES[0]
}

export default i18n
