import axios from 'axios'

// Dynamic API URL - uses current host for network access
const API_URL = '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add auth token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            // Optionally redirect to login
        }
        return Promise.reject(error)
    }
)

// ========================
// AUTH SERVICES
// ========================

export const authService = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData)
        if (response.data.token) {
            localStorage.setItem('token', response.data.token)
            localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response.data
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials)
        if (response.data.token) {
            localStorage.setItem('token', response.data.token)
            localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response.data
    },

    logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me')
        return response.data
    },

    updateProfile: async (formData) => {
        const response = await api.put('/auth/profile', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response.data
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token')
    },

    getStoredUser: () => {
        const user = localStorage.getItem('user')
        return user ? JSON.parse(user) : null
    }
}

// ========================
// QUEUE SERVICES (Single Store)
// ========================

export const queueService = {
    // Get current queue status (single store)
    getStatus: async () => {
        const response = await api.get('/queue/status')
        return response.data
    },

    // Join queue (single store - no storeId needed)
    join: async (queueType, guestQueueId = null) => {
    const response = await api.post('/queue/join', { queueType, guestQueueId })
    return response.data
},

    // Leave queue
 leave: async (queueId) => {
    const response = await api.post('/queues/leave', { queueId })
    return response.data
},

    // Get user's queue status
    getMyStatus: async () => {
        const response = await api.get('/queues/my-status')
        return response.data
    },

    // Staff: Call next customer
    callNext: async (queueType) => {
        const response = await api.post('/queue/call-next', { queueType })
        return response.data
    },

    // Staff: Complete service
    complete: async (queueId) => {
        const response = await api.post('/queue/complete', { queueId })
        return response.data
    },

    // Legacy: Get store queue (for backward compatibility)
    getStoreQueue: async (storeId) => {
        const response = await api.get(`/queues/${storeId}`)
        return response.data
    },

    // Legacy: Join with storeId
    joinLegacy: async (storeId, queueType) => {
        const response = await api.post('/queues/join', { storeId, queueType })
        return response.data
    },

    getHistory: async () => {
        const response = await api.get('/queues/history')
        return response.data
    }
}

// ========================
// STORE SERVICES
// ========================

export const storeService = {
    // Get single store info (for single-shop system)
    getStore: async () => {
        const response = await api.get('/store')
        return response.data
    },

    // Get all stores (legacy)
    getAll: async () => {
        const response = await api.get('/stores')
        return response.data
    },

    getById: async (id) => {
        const response = await api.get(`/stores/${id}`)
        return response.data
    }
}

// ========================
// PRODUCT SERVICES
// ========================

export const productService = {
    getAll: async (params = {}) => {
        const response = await api.get('/products', { params })
        return response.data
    },

    getById: async (id) => {
        const response = await api.get(`/products/${id}`)
        return response.data
    },

    getCategories: async () => {
        const response = await api.get('/products/categories/list')
        return response.data
    }
}

// ========================
// OUTFIT MATCH SERVICES
// ========================

export const outfitService = {
    match: async (imageFile, gender = null) => {
        const formData = new FormData()
        formData.append('image', imageFile)
        if (gender) {
            formData.append('gender', gender)
        }

        const response = await api.post('/outfit-match', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    getHistory: async () => {
        const response = await api.get('/outfit-match/history')
        return response.data
    }
}

// ========================
// FAVORITES SERVICES
// ========================

export const favoriteService = {
    getAll: async () => {
        const response = await api.get('/favorites')
        return response.data
    },

    add: async (productId) => {
        const response = await api.post('/favorites', { productId })
        return response.data
    },

    remove: async (productId) => {
        const response = await api.delete(`/favorites/${productId}`)
        return response.data
    },

    check: async (productId) => {
        const response = await api.get(`/favorites/check/${productId}`)
        return response.data
    }
}

// ========================
// ADMIN SERVICES
// ========================

export const adminService = {
    getStats: async () => {
        const response = await api.get('/admin/stats')
        return response.data
    },

    getUsers: async () => {
        const response = await api.get('/admin/users')
        return response.data
    },

    getQueues: async (status = 'waiting') => {
        const response = await api.get('/admin/queues', { params: { status } })
        return response.data
    },

    createProduct: async (formData) => {
        const response = await api.post('/admin/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    updateProduct: async (id, formData) => {
        const response = await api.put(`/admin/products/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return response.data
    },

    deleteProduct: async (id) => {
        const response = await api.delete(`/admin/products/${id}`)
        return response.data
    }
}

// ========================
// HEALTH CHECK
// ========================

export const healthCheck = async () => {
    try {
        const response = await api.get('/health')
        return response.data
    } catch (error) {
        return { status: 'ERROR', message: 'API not available' }
    }
}

export default api
