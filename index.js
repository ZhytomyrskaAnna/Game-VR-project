const MAX_SLOT = 12; 
let statusDisplay = document.getElementById("status-display");

// URL вашого сервера (змініть після розгортання на Render)
const SERVER_URL = 'https://game-vr-project.onrender.com'; 


AFRAME.registerComponent('look-at-camera', {
    tick: function () {
        var el = this.el;
        var cameraEl = document.querySelector('[camera]');

        if (!cameraEl) {
            console.warn('Camera entity not found.');
            return;
        }
        el.object3D.lookAt(cameraEl.object3D.position);
    }
});


AFRAME.registerComponent('prizeslots', {
    init: function () {
        let marker = this.el;

        marker.addEventListener('markerFound', async function() {
            const markerValue = marker.getAttribute("value");
            
            try {
                const response = await fetch(`${SERVER_URL}/check-marker`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ marker: parseInt(markerValue) })
                });

                const data = await response.json();
                
                    if (data.success) {
                        // Show prize info using a JS alert instead of adding an in-scene text element
                        alert(`You found the prize at slot #${data.markerNumber}!`);
                    } else {
                        // Show feedback via alert only
                        alert(data.message);
                    }
                
            } catch (error) {
                console.error('Error connecting to server:', error);
                alert('Error connecting to server. Please check your connection.');
            }
        });
    }
});

// Функція для адміністратора (опціонально)
async function generateNewPrize() {
    try {
        const response = await fetch(`${SERVER_URL}/admin/reset-prize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            if (statusDisplay) {
                statusDisplay.textContent = "Status: Ready to search!";
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate a new prize.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    statusDisplay = document.getElementById("status-display");
    if (statusDisplay) {
        statusDisplay.textContent = "Статус: Готово до пошуку!";
    }
    // Start the on-screen stopwatch (HH:MM:SS) each time the page is opened
    const hudTimerEl = document.querySelector('.hud-timer');
    if (hudTimerEl) {
        // Ensure any existing timer is cleared (in case of hot-reload)
        if (window._prizeHudTimerInterval) {
            clearInterval(window._prizeHudTimerInterval);
        }

        function pad(n) {
            return n.toString().padStart(2, '0');
        }

        function updateStopwatch(startTimestamp) {
            const elapsed = Date.now() - startTimestamp;
            const totalSeconds = Math.floor(elapsed / 1000);
            const seconds = totalSeconds % 60;
            const minutes = Math.floor(totalSeconds / 60) % 60;
            const hours = Math.floor(totalSeconds / 3600);
            hudTimerEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }

        // Initialize and start from zero
        const startTs = Date.now();
        updateStopwatch(startTs);
        window._prizeHudTimerInterval = setInterval(() => updateStopwatch(startTs), 1000);
    }
});

