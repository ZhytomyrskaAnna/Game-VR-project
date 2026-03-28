const MAX_SLOT = 12; 
let statusDisplay = document.getElementById("status-display");

// Логика сценария для дня открытых дверей и командной игры
/* const openHouseRoute = [12,13,14,15,16]; // Порядок прохождения
const openHouseHints = {
    12: "Ви на старті! Наступна точка: Бібліотека.",
    13: "Бібліотека пройдена. Шукайте маркер у Кафетерії.",
    14: "Смачно! Тепер прямуйте до Головної Аудиторії.",
    15: "Майже фініш! Знайдіть маркер біля Деканату.",
    16: "Вітаємо! Ви пройшли весь маршрут Дня відкритих дверей!"
}; 
const groupFirstGameRoute = [24, 25, 26, 27, 28, 29]; // Порядок прохождения
const groupSecondGameRoute = [30, 31, 32, 33, 34, 35]; // Порядок прохождения
const groupGameHints = {
    24: "Ви на старті! Наступна точка: Бібліотека.",
    25: "Бібліотека пройдена. Шукайте маркер у Кафетерії.",
    26: "Смачно! Тепер прямуйте до Головної Аудиторії.",
    27: "Майже фініш! Знайдіть маркер біля Деканату.",
    28: "Вітаємо! Ви пройшли весь маршрут Командної гри!"
};
const groupGameHints = {
    30: "Ви на старті! Наступна точка: Бібліотека.",
    31: "Бібліотека пройдена. Шукайте маркер у Кафетерії.",
    32: "Смачно! Тепер прямуйте до Головної Аудиторії.",
    33: "Майже фініш! Знайдіть маркер біля Деканату.",
    34: "Вітаємо! Ви пройшли весь маршрут Командної гри!"
}; */

// URL твоего сервера
const SERVER_URL = 'https://game-vr-project.onrender.com'; 

AFRAME.registerComponent('look-at-camera', {
    tick: function () {
        var el = this.el;
        var cameraEl = document.querySelector('[camera]');
        if (!cameraEl) return;
        el.object3D.lookAt(cameraEl.object3D.position);
    }
});

let isScanning = false; // Флаг, идет ли процесс сканирования
let isWinner = false;   // Флаг, выиграл ли уже игрок

AFRAME.registerComponent('prizeslots', {
    init: function () {
        let marker = this.el;

        marker.addEventListener('markerFound', async function() {
            // Если игрок уже выиграл или идет сканирование — ничего не делаем
            if (isScanning || isWinner) return;
            
            isScanning = true;
            const markerValue = marker.getAttribute("value");
            
            // Показываем временное сообщение "Сканирую..."
            showOverlayMessage(`Перевірка маркера №${markerValue}...`, 'info');

            try {
                const response = await fetch(`${SERVER_URL}/check-marker`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ marker: parseInt(markerValue) })
                });

                const data = await response.json();
                
                if (data.success) {
                    // === ПОБЕДА! ===
                    isWinner = true; // Блокуємо подальші сканування назавжди
                    showWinScreen(data.message, data.markerNumber); // Викликаємо ВІЧНИЙ екран
                } else {
                    // === НЕУДАЧА ===
                    showOverlayMessage(`❌ ${data.message}`, 'error');
                    // Разблокируем сканер через 3 секунды для новой попытки
                    setTimeout(() => {
                        if (!isWinner) isScanning = false;
                    }, 3000);
                }
                
            } catch (error) {
                console.error('Error:', error);
                showOverlayMessage('Помилка з\'єднання.', 'error');
                setTimeout(() => { isScanning = false; }, 3000);
            }
        });
    }
});

// 1. Обычные временные сообщения (для ошибок и процесса)
function showOverlayMessage(text, type) {
    let msgDiv = document.getElementById('ar-message-overlay');
    
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'ar-message-overlay';
        // Стили для маленького уведомления
        msgDiv.style.position = 'fixed';
        msgDiv.style.top = '15%';
        msgDiv.style.left = '50%';
        msgDiv.style.transform = 'translate(-50%, -50%)';
        msgDiv.style.padding = '10px 20px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.color = '#fff';
        msgDiv.style.fontFamily = 'Arial, sans-serif';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.zIndex = '9999';
        msgDiv.style.textAlign = 'center';
        msgDiv.style.fontSize = '16px';
        document.body.appendChild(msgDiv);
    }

    if (type === 'error') msgDiv.style.background = 'rgba(220, 53, 69, 0.9)';
    else msgDiv.style.background = 'rgba(0, 123, 255, 0.9)';

    msgDiv.innerText = text;
    msgDiv.style.display = 'block';

    // Исчезает через 2.5 сек
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 2500);
}

// 2. ЭКРАН ПОБЕДИТЕЛЯ (Вечный и на весь экран)
function showWinScreen(message, markerNum) {
    // Удаляем обычные сообщения, чтобы не мешали
    let oldMsg = document.getElementById('ar-message-overlay');
    if (oldMsg) oldMsg.remove();

    // Создаем полноэкранный блок
    let winDiv = document.createElement('div');
    winDiv.style.position = 'fixed';
    winDiv.style.top = '0';
    winDiv.style.left = '0';
    winDiv.style.width = '100vw';
    winDiv.style.height = '100vh'; // На весь экран
    winDiv.style.backgroundColor = '#28a745'; // Ярко-зеленый фон
    winDiv.style.display = 'flex';
    winDiv.style.flexDirection = 'column';
    winDiv.style.justifyContent = 'center';
    winDiv.style.alignItems = 'center';
    winDiv.style.zIndex = '100000'; // Поверх всего интерфейса
    winDiv.style.color = 'white';
    winDiv.style.fontFamily = 'Arial, sans-serif';
    winDiv.style.textAlign = 'center';
    winDiv.style.padding = '20px';
    winDiv.style.boxSizing = 'border-box';

    // Получаем текущее время для защиты от скриншотов
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    winDiv.innerHTML = `
        <div style="font-size: 60px;">🏆</div>
        <h1 style="font-size: 32px; margin: 20px 0;">ВІТАЄМО!</h1>
        <p style="font-size: 20px; font-weight: bold;">${message}</p>
        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-top: 30px;">
            <p style="margin: 5px 0; font-size: 14px;">Покажіть цей екран організаторам</p>
            <p style="margin: 5px 0; font-size: 24px; font-weight: bold;">МАРКЕР №${markerNum}</p>
            <p style="margin: 5px 0; font-size: 14px; opacity: 0.8;">Час знахідки: ${timeString}</p>
        </div>
        <p style="margin-top: 50px; color: #d4edda; font-size: 12px;">Не оновлюйте сторінку до отримання призу!</p>
    `;

    document.body.appendChild(winDiv);
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
/*date and time css */
function updateDateTime() {
    const now = new Date();

    const time = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    const date = now.toLocaleDateString();

    document.getElementById("clock").textContent = time;
    document.getElementById("date").textContent = date;
}

setInterval(updateDateTime, 60000);
updateDateTime();
/*date and time css */


function showInfoModal(text) {
    let modal = document.getElementById('ar-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ar-info-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border-radius: 12px; z-index: 99999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 80%; max-width: 300px;
            text-align: center; font-family: Arial; color: black;
        `;

        // Кнопка закрытия
        let closeBtn = document.createElement('button');
        closeBtn.innerText = '✖';
        closeBtn.style.cssText = `
            position: absolute; top: 10px; right: 10px; background: none; 
            border: none; font-size: 18px; cursor: pointer; color: #333;
        `;
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            setTimeout(() => { isScanning = false; }, 1000); // Разблокируем сканер
        };

        let content = document.createElement('p');
        content.id = 'ar-info-content';

        modal.appendChild(closeBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    document.getElementById('ar-info-content').innerText = text;
    modal.style.display = 'block';
}