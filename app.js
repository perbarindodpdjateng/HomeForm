// Konfigurasi Google Spreadsheet
const CONFIG = {
    // Ganti dengan URL CSV publik dari Google Sheets Anda
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/2PACX-1vS-r3hKHQE7PU2HlEVHbK_dgvVqw0Rmt0hi2l2_QJNWl8pZlPJB-uqY3VU_VeFANFMVEKgd_-s1hMBN/gviz/tq?tqx=out:csv&sheet=Sheet1',
    
    // Cache duration (ms)
    cacheDuration: 300000, // 5 menit
};

// State management
let cache = {
    data: null,
    timestamp: 0
};

// Optimasi loading dengan skeleton
function showSkeleton() {
    const container = document.getElementById('data-container');
    const table = document.getElementById('data-table');
    
    table.innerHTML = `
        <thead>
            <tr>
                <th><div class="skeleton-box" style="width: 80px"></div></th>
                <th><div class="skeleton-box" style="width: 120px"></div></th>
                <th><div class="skeleton-box" style="width: 100px"></div></th>
                <th><div class="skeleton-box" style="width: 150px"></div></th>
            </tr>
        </thead>
        <tbody>
            ${Array(5).fill('').map(() => `
                <tr>
                    <td><div class="skeleton-box" style="width: 90%"></div></td>
                    <td><div class="skeleton-box" style="width: 85%"></div></td>
                    <td><div class="skeleton-box" style="width: 75%"></div></td>
                    <td><div class="skeleton-box" style="width: 95%"></div></td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    container.classList.remove('hidden');
}

// Fetch data dengan cache
async function fetchData() {
    const now = Date.now();
    
    // Cek cache
    if (cache.data && (now - cache.timestamp < CONFIG.cacheDuration)) {
        return cache.data;
    }
    
    try {
        const response = await fetch(CONFIG.spreadsheetUrl);
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, { header: true });
        
        if (parsed.errors.length > 0) {
            throw new Error('Gagal parsing CSV');
        }
        
        // Simpan ke cache
        cache = {
            data: parsed.data,
            timestamp: now
        };
        
        return parsed.data;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Render tabel dengan virtual scrolling untuk performa
function renderTable(data) {
    const table = document.getElementById('data-table');
    
    if (!data || data.length === 0) {
        table.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 40px;">Tidak ada data</td></tr>';
        return;
    }
    
    const headers = Object.keys(data[0]);
    
    let html = '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Render hanya 50 baris pertama untuk performa
    const displayData = data.slice(0, 50);
    
    displayData.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            const value = row[header] || '-';
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    
    table.innerHTML = html;
}

// Fungsi refresh
async function refreshData() {
    const loadingEl = document.getElementById('loading');
    const container = document.getElementById('data-container');
    
    loadingEl.style.display = 'block';
    container.classList.add('hidden');
    
    try {
        // Clear cache saat refresh
        cache = { data: null, timestamp: 0 };
        
        const data = await fetchData();
        
        // Animasi smooth
        setTimeout(() => {
            loadingEl.style.display = 'none';
            renderTable(data);
            container.classList.remove('hidden');
            container.style.animation = 'fadeInUp 0.5s ease-out';
        }, 300);
        
    } catch (error) {
        loadingEl.innerHTML = `
            <div style="color: #e74c3c; padding: 40px;">
                <h3>❌ Gagal memuat data</h3>
                <p>${error.message}</p>
                <button class="btn-emboss" onclick="refreshData()" style="margin-top: 20px">
                    Coba Lagi
                </button>
            </div>
        `;
    }
}

// Export data
function exportData() {
    if (!cache.data) return;
    
    const csv = Papa.unparse(cache.data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    link.href = URL.createObjectURL(blob);
    link.download = `data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Auto-refresh setiap 5 menit
setInterval(() => {
    if (document.visibilityState === 'visible') {
        refreshData();
    }
}, 300000);

// Service Worker untuk caching (optional untuk performa lebih baik)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    refreshData();

});
