// Configuration for API endpoints
const CONFIG = {
    API_BASE: 'http://localhost:8000'  // Backend server on port 8000
};

// Make API_BASE globally available
const API_BASE = CONFIG.API_BASE;

// Global API call function with automatic /api prefix
async function apiCall(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Add authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    // Ensure endpoint starts with /api
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${API_BASE}${apiEndpoint}`;
    
    try {
        console.log(`📡 API Call: ${method} ${url}`);
        
        const response = await fetch(url, options);
        
        // Handle 401 Unauthorized (token expired)
        if (response.status === 401) {
            console.log('🔒 Session expired - redirecting to login');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            window.location.href = '/login.html?session=expired';
            throw new Error('Session expired. Please login again.');
        }
        
        // Handle 403 Forbidden
        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action');
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('❌ API call failed:', error);
        if (typeof showToast === 'function') {
            showToast(error.message, 'error');
        } else if (typeof showAlert === 'function') {
            showAlert(error.message, 'danger');
        }
        throw error;
    }
}

// Log for debugging
console.log('✅ Config loaded - API_BASE:', API_BASE);
console.log('✅ Environment:', window.location.hostname);
console.log('✅ Frontend port:', window.location.port);