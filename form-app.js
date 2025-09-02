// Konfigurasi Google Apps Script
const CONFIG = {
    // Ganti dengan URL Web App Anda dari Google Apps Script
    scriptURL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    // Validasi real-time
    validation: {
        nama: {
            pattern: /^[a-zA-Z\s]{3,}$/,
            message: 'Nama minimal 3 karakter huruf'
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Format email tidak valid'
        },
        telepon: {
            pattern: /^[0-9]{10,13}$/,
            message: 'Nomor telepon 10-13 digit'
        }
    }
};

// State
let formData = {};
let isSubmitting = false;

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    loadStats();
});

// Setup Google Apps Script
function initializeForm() {
    const form = document.getElementById('modernForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    
    // Real-time validation
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            validateField(e.target);
            formData[e.target.name] = e.target.value;
        });
        
        input.addEventListener('blur', (e) => {
            validateField(e.target, true);
        });
    });
    
    // Form submission
    form.addEventListener('submit', handleSubmit);
}

// Validasi field
function validateField(field, showError = false) {
    const value = field.value.trim();
    const rules = CONFIG.validation[field.name];
    
    if (!rules) return true;
    
    const isValid = rules.pattern.test(value);
    const group = field.closest('.input-group');
    
    if (showError && !isValid) {
        showFieldError(group, rules.message);
    } else {
        clearFieldError(group);
    }
    
    return isValid;
}

function showFieldError(group, message) {
    let errorEl = group.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.style.cssText = `
            color: var(--error);
            font-size: 0.8rem;
            margin-top: 5px;
            animation: fadeInUp 0.3s ease-out;
        `;
        group.appendChild(errorEl);
    }
    errorEl.textContent = message;
    group.style.setProperty('--border-color', 'var(--error)');
}

function clearFieldError(group) {
    const errorEl = group.querySelector('.error-message');
    if (errorEl) errorEl.remove();
    group.style.removeProperty('--border-color');
}

// Handle submit dengan optimasi
async function handleSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validasi semua field
    const form = e.target;
    const inputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateField(input, true)) {
            isValid = false;
        }
    });
    
    if (!isValid) return;
    
    // Prepare data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    data.timestamp = new Date().toISOString();
    
    // Show loading
    isSubmitting = true;
    showLoadingState();
    
    try {
        // Submit dengan retry mechanism
        const result = await submitWithRetry(data);
        
        if (result.success) {
            showSuccessState();
            updateStats();
            form.reset();
        } else {
            throw new Error(result.error || 'Gagal mengirim data');
        }
        
    } catch (error) {
        showErrorState(error.message);
    } finally {
        isSubmitting = false;
        hideLoadingState();
    }
}

// Submit dengan retry
async function submitWithRetry(data, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(CONFIG.scriptURL, {
                method: 'POST',
                body: new URLSearchParams(data),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            
            return await response.json();
            
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// UI States
function showLoadingState() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
}

function hideLoadingState() {
    const btn = document.getElementById('submitBtn');
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
}

function showSuccessState() {
    document.getElementById('modernForm').classList.add('hidden');
    document.getElementById('successMsg').classList.remove('hidden');
}

function showErrorState(message) {
    alert(`❌ Error: ${message}`);
}

function resetForm() {
    document.getElementById('modernForm').classList.remove('hidden');
    document.getElementById('successMsg').classList.add('hidden');
    formData = {};
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${CONFIG.scriptURL}?action=stats`);
        const stats = await response.json();
        
        document.getElementById('totalSubmissions').textContent = stats.total || '0';
        document.getElementById('todaySubmissions').textContent = stats.today || '0';
        
    } catch (error) {
        console.log('Gagal load stats:', error);
    }
}

// Update stats setelah submit
function updateStats() {
    const totalEl = document.getElementById('totalSubmissions');
    const todayEl = document.getElementById('todaySubmissions');
    
    if (totalEl.textContent !== '-') {
        totalEl.textContent = parseInt(totalEl.textContent) + 1;
    }
    
    if (todayEl.textContent !== '-') {
        todayEl.textContent = parseInt(todayEl.textContent) + 1;
    }
}

// Auto-save draft
setInterval(() => {
    const form = document.getElementById('modernForm');
    if (!form.classList.contains('hidden')) {
        localStorage.setItem('formDraft', JSON.stringify(formData));
    }
}, 5000);

// Restore draft
window.addEventListener('load', () => {
    const draft = localStorage.getItem('formDraft');
    if (draft) {
        try {
            formData = JSON.parse(draft);
            Object.entries(formData).forEach(([key, value]) => {
                const field = document.querySelector(`[name="${key}"]`);
                if (field) field.value = value;
            });
        } catch (e) {
            localStorage.removeItem('formDraft');
        }
    }
});
