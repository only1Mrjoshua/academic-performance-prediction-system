// Helper function to check environment
function isLocalhostEnvironment() {
    return (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
    );
}

// Helper function to get frontend page URL
function getFrontendPath(page) {
    return isLocalhostEnvironment()
        ? `/frontend/${page}`
        : `/${page}`;
}

// Helper function to get API base URL
function getApiBase() {
    return isLocalhostEnvironment()
        ? 'http://localhost:8000'
        : 'https://academic-performance-prediction-system.onrender.com';
}

// Get auth state from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function getUserRole() {
    return localStorage.getItem('userRole');
}

function getUsername() {
    return localStorage.getItem('username');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Check if user has required role
function hasRole(requiredRole) {
    const role = getUserRole();
    if (!role) return false;
    if (requiredRole === 'any') return true;
    if (requiredRole === 'admin' && role === 'admin') return true;
    if (requiredRole === 'lecturer' && (role === 'lecturer' || role === 'admin')) return true;
    return role === requiredRole;
}

// Redirect to login if not authenticated
function requireAuth(requiredRole = 'any') {
    if (!isAuthenticated()) {
        window.location.href = getFrontendPath('login.html');
        return false;
    }

    if (!hasRole(requiredRole)) {
        window.location.href = getFrontendPath('unauthorized.html');
        return false;
    }

    return true;
}

// Render Lucide icons after dynamic HTML updates
function renderLucideIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    console.log('🔐 Login attempt started');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('errorMessage');

    const apiBase = getApiBase();

    console.log('API Base URL:', apiBase);
    console.log('Login endpoint:', `${apiBase}/auth/token`);

    loginButton.disabled = true;
    loginButton.innerHTML = `
        <i data-lucide="refresh-cw" class="w-5 h-5 animate-spin"></i>
        <span>Signing in...</span>
    `;
    renderLucideIcons();

    errorMessage.classList.add('hidden');

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${apiBase}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        console.log('📥 Response status:', response.status);

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }

        console.log('📦 Response data:', data);

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store auth data
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', data.username);

        showToast(`Welcome back, ${data.username}!`, 'success');

        // Redirect based on role
        setTimeout(() => {
            if (data.role === 'admin') {
                window.location.href = getFrontendPath('admin.html');
            } else {
                window.location.href = getFrontendPath('lecturer.html');
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Login error:', error);

        errorMessage.textContent = error.message || 'Invalid username or password. Please try again.';
        errorMessage.classList.remove('hidden');

        loginButton.disabled = false;
        loginButton.innerHTML = `
            <i data-lucide="log-in" class="w-5 h-5"></i>
            <span>Sign In</span>
        `;
        renderLucideIcons();
    }
}

// Handle logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');

    if (typeof showToast === 'function') {
        showToast('Logged out successfully', 'info');
    }

    setTimeout(() => {
        window.location.href = getFrontendPath('login.html');
    }, 500);
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleButton = event.currentTarget;
    const icon = toggleButton.querySelector('[data-lucide]');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        passwordInput.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }

    renderLucideIcons();
}

// API call with authentication
async function apiCall(endpoint, method = 'GET', data = null) {
    const apiBase = getApiBase();

    const headers = {
        'Content-Type': 'application/json'
    };

    const token = getAuthToken();
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

    try {
        console.log(`📡 API Call: ${method} ${apiBase}${endpoint}`);

        const response = await fetch(`${apiBase}${endpoint}`, options);

        if (response.status === 401) {
            console.log('🔒 Session expired');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            window.location.href = `${getFrontendPath('login.html')}?session=expired`;
            throw new Error('Session expired. Please login again.');
        }

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
        }
        throw error;
    }
}

// Toast notification system
function showToast(message, type = 'success', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    const bgColor = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    }[type] || 'bg-slate-50 border-slate-200 text-slate-800';

    const iconColor = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-amber-500',
        info: 'text-blue-500'
    }[type] || 'text-slate-500';

    const icon = {
        success: 'circle-check',
        error: 'circle-alert',
        warning: 'triangle-alert',
        info: 'info'
    }[type] || 'bell';

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColor} shadow-lg backdrop-blur-sm min-w-[300px] max-w-md`;
    toast.style.animation = 'slideIn 0.3s ease';

    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>
        <span class="flex-1 text-sm font-medium">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
        </button>
    `;

    container.appendChild(toast);
    renderLucideIcons();

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Update navigation based on auth state
function updateNavigation() {
    const token = getAuthToken();
    const role = getUserRole();

    const navRight = document.querySelector('.flex.items-center.gap-3:last-child');
    if (!navRight) return;

    if (token) {
        navRight.innerHTML = `
            <span class="text-sm text-slate-600 hidden md:inline">
                ${role === 'admin' ? '👑 Admin' : '👨‍🏫 Lecturer'}
            </span>
            <button 
                onclick="logout()"
                class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
                <i data-lucide="log-out" class="w-5 h-5"></i>
                <span class="hidden sm:inline">Logout</span>
            </button>
        `;
    } else {
        navRight.innerHTML = `
            <a 
                href="${getFrontendPath('login.html')}"
                class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
                <i data-lucide="log-in" class="w-5 h-5"></i>
                <span>Login</span>
            </a>
        `;
    }

    renderLucideIcons();
}

// Check session on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth.js loaded');
    console.log('API Base URL:', getApiBase());
    console.log('Current path:', window.location.pathname);

    updateNavigation();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session') === 'expired') {
        showToast('Your session has expired. Please login again.', 'warning');
    }

    renderLucideIcons();
});

// Make functions globally available
window.handleLogin = handleLogin;
window.logout = logout;
window.togglePasswordVisibility = togglePasswordVisibility;
window.apiCall = apiCall;
window.showToast = showToast;
window.isAuthenticated = isAuthenticated;
window.getUserRole = getUserRole;