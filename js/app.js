// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let devices = {};
const devicesTableBody = document.getElementById("devices-table-body");
const connectionStatus = document.getElementById("connection-status");
const totalDevicesEl = document.getElementById("total-devices");
const onlineDevicesEl = document.getElementById("online-devices");
const offlineDevicesEl = document.getElementById("offline-devices");

function init() {
    // System Init

    // Connection Status
    db.ref(".info/connected").on("value", (snap) => {
        if (snap.val() === true) {
            connectionStatus.textContent = "Connected";
            connectionStatus.classList.add("status-online");
            connectionStatus.classList.remove("status-offline");
        } else {
            connectionStatus.textContent = "Disconnected";
            connectionStatus.classList.add("status-offline");
            connectionStatus.classList.remove("status-online");
        }
    });

    // Devices Listener
    db.ref("devices").on("value", (snap) => {
        devices = snap.val() || {};
        renderDevicesTable();
        updateStats();
    });
}

function renderDevicesTable() {
    devicesTableBody.innerHTML = "";
    if (Object.keys(devices).length === 0) {
        devicesTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-secondary);">No active connections</td></tr>';
        return;
    }

    Object.entries(devices).forEach(([id, device]) => {
        const row = document.createElement("tr");
        const isOnline = device.status === "online";
        // Check if last seen is recent (e.g. within 5 mins) to trust 'online' status? 
        // For now trusting DB status.

        const statusBadge = `<span class="status-badge ${isOnline ? "status-online" : "status-offline"}">${isOnline ? "Online" : "Offline"}</span>`;

        row.innerHTML = `
            <td>${statusBadge}</td>
            <td style="font-weight: 500; color: var(--text-main);">${device.model || "Unknown"}</td>
            <td>${device.androidVersion || "N/A"}</td>
            <td class="battery-level">${device.batteryLevel ? device.batteryLevel + "%" : "N/A"}</td>
            <td style="font-family: monospace;">${device.ipAddress || "Unknown"}</td>
            <td>${device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "Never"}</td>
            <td>
                <a class="btn btn-sm btn-gradient-purple" href="device.html?id=${id}">
                    View Details
                </a>
            </td>
        `;
        devicesTableBody.appendChild(row);
    });
}

function updateStats() {
    const total = Object.keys(devices).length;
    const online = Object.values(devices).filter(d => d.status === "online").length;
    const offline = total - online;

    totalDevicesEl.textContent = total;
    onlineDevicesEl.textContent = online;
    offlineDevicesEl.textContent = offline;
}

init();
