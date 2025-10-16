const MAX_SLOT = 12; 
let statusDisplay = document.getElementById("status-display");

// URL вашого сервера (змініть після розгортання на Render)
const SERVER_URL = window.location.origin; // Або 'https://your-app.onrender.com'

//функція переводу кирилиці в латиницю
function transliterate(text) {
    const charMap = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
        'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
        'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ю': 'yu', 'я': 'ya',
        'ь': '', 'ъ': '', ' ': '_', '.': '', ',': '', '!': '', '?': '', '-': '_'
    };

    return text.split('').map(char => charMap[char] || char).join('');
}

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
                    //відобразити напис прямо на маркері
                    let textEntity = document.createElement('a-text');
                    textEntity.setAttribute('value', transliterate(data.message));
                    textEntity.setAttribute('position', '0 0.5 0');
                    textEntity.setAttribute('scale', '2 2 2');
                    marker.appendChild(textEntity);
                    
                } else {
                    let textEntity = document.createElement('a-text');
                    textEntity.setAttribute('value', transliterate(data.message));
                    textEntity.setAttribute('position', '0 0.5 0');
                    textEntity.setAttribute('scale', '2 2 2');
                    marker.appendChild(textEntity);
                }
                
            } catch (error) {
                console.error('Помилка зв\'язку з сервером:', error);
                alert('Помилка зв\'язку з сервером. Перевірте підключення.');
            }
        });
        // якщо на маркер додано текст, видалити його при втраті маркера
        marker.addEventListener('markerLost', function() {
            let textEntity = marker.querySelector('a-text');
            if (textEntity) {
                marker.removeChild(textEntity);
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
                statusDisplay.textContent = "Статус: Новий приз згенеровано!";
            }
        }
    } catch (error) {
        console.error('Помилка:', error);
        alert('Не вдалося згенерувати новий приз.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    statusDisplay = document.getElementById("status-display");
    if (statusDisplay) {
        statusDisplay.textContent = "Статус: Готово до пошуку!";
    }
});