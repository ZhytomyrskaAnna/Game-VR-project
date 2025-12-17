const MAX_SLOT = 12; 
let statusDisplay = document.getElementById("status-display");

// URL вашого сервера (змініть після розгортання на Render)
const SERVER_URL = 'https://game-vr-project.onrender.com'; 

//функція переводу кирилиці в латиницю

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


// Змінна для запобігання спаму запитами (Cooldown)
let isScanning = false;

AFRAME.registerComponent('prizeslots', {
    init: function () {
        let marker = this.el;

        marker.addEventListener('markerFound', async function() {
            // 1. Якщо ми вже скануємо або нещодавно сканували, ігноруємо
            if (isScanning) return;
            
            isScanning = true; // Блокуємо повторні сканування
            const markerValue = marker.getAttribute("value");
            
            // Показуємо користувачеві, що йде перевірка
            showOverlayMessage(`Scanning marker #${markerValue}...`, 'info');

            try {
                const response = await fetch(`${SERVER_URL}/check-marker`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marker: parseInt(markerValue) })
                });

                const data = await response.json();
                
                // 2. Виводимо результат не в alert, а в overlay
                if (data.success) {
                    showOverlayMessage(`🎉 ${data.message}`, 'success');
                } else {
                    showOverlayMessage(`❌ ${data.message}`, 'error');
                }
                
            } catch (error) {
                console.error('Error connecting to server:', error);
                showOverlayMessage('Connection error. Try again.', 'error');
            } finally {
                // 3. Розблокуємо сканування через 3 секунди (щоб встигли прибрати камеру)
                setTimeout(() => {
                    isScanning = false;
                }, 3000);
            }
        });
    }
});

// Функція для показу повідомлень поверх екрану (замість alert)
function showOverlayMessage(text, type) {
    let msgDiv = document.getElementById('ar-message-overlay');
    
    // Створюємо дів, якщо його немає
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'ar-message-overlay';
        msgDiv.style.position = 'fixed';
        msgDiv.style.top = '10%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.padding = '15px 25px';
        msgDiv.style.borderRadius = '10px';
        msgDiv.style.color = '#fff';
        msgDiv.style.fontFamily = 'Arial, sans-serif';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.zIndex = '9999';
        msgDiv.style.textAlign = 'center';
        document.body.appendChild(msgDiv);
    }

    // Кольори залежно від типу
    if (type === 'success') msgDiv.style.background = 'rgba(40, 167, 69, 0.9)'; // Зелений
    else if (type === 'error') msgDiv.style.background = 'rgba(220, 53, 69, 0.9)'; // Червоний
    else msgDiv.style.background = 'rgba(0, 123, 255, 0.9)'; // Синій

    msgDiv.innerText = text;
    msgDiv.style.display = 'block';

    // Ховаємо повідомлення через 2.5 секунди
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 2500);
}

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
});

