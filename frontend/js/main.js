// Get API Base URL from config.js - REMOVE THIS LINE
// const API_BASE = CONFIG.API_BASE;  // DELETE THIS LINE

// Optional: Log which URL is being used (helpful for debugging)
console.log('API URL from main.js:', typeof API_BASE !== 'undefined' ? API_BASE : 'API_BASE not defined');

// Alert System
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find the main content area to insert the alert
    const mainContent = document.querySelector('main, .container, .content') || document.body;
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        openModals.forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Form Validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Form not found:', formId);
        return false;
    }
    
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    for (let input of inputs) {
        if (!input.value || !input.value.trim()) {
            showAlert(`${input.name || 'Field'} is required`, 'danger');
            input.focus();
            return false;
        }
    }
    
    // Validate numeric fields
    const numbers = form.querySelectorAll('input[type="number"]');
    for (let input of numbers) {
        if (input.value) { // Only validate if there's a value
            const value = parseFloat(input.value);
            if (input.min && value < parseFloat(input.min)) {
                showAlert(`${input.name || 'Value'} must be at least ${input.min}`, 'danger');
                input.focus();
                return false;
            }
            if (input.max && value > parseFloat(input.max)) {
                showAlert(`${input.name || 'Value'} must be at most ${input.max}`, 'danger');
                input.focus();
                return false;
            }
        }
    }
    
    return true;
}

// Load navigation and check auth
document.addEventListener('DOMContentLoaded', function() {
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-nav a, .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Add Bootstrap classes to alerts if Bootstrap is being used
    if (typeof bootstrap !== 'undefined') {
        // Bootstrap is loaded, we can use their alert component
        console.log('Bootstrap detected');
    }
});

// Export functions if using modules (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showAlert,
        openModal,
        closeModal,
        validateForm
    };
}