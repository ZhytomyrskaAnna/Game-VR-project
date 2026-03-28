// 12 маркерів для полювання на призи (0-11) + 12 для відкритого дня (12-23) + 12 для командної гри (24-35)
const NUMBER_OF_MARKERS = 36;

function generateMarkers() {
    
    const parentScene = document.querySelector('a-scene'); 

    if (!parentScene) {
        console.error("Помилка: Елемент <a-scene> не знайдено!");
        return;
    }

    for (let i = 0; i <= NUMBER_OF_MARKERS; i++) {

        const marker = document.createElement('a-marker');
        
        marker.setAttribute('type', 'barcode');
        marker.setAttribute('value', i.toString());
        marker.setAttribute('prizeslots', '');
        
        parentScene.appendChild(marker);
    }

    console.log(`Успішно згенеровано ${NUMBER_OF_MARKERS} маркерів (від 0 до ${NUMBER_OF_MARKERS}).`);
}


document.addEventListener('DOMContentLoaded', generateMarkers);

const markerValue = parseInt(marker.getAttribute("value"));

// Проверяем, относится ли маркер ко Дню открытых дверей
if (openHouseRoute.includes(markerValue)) {
    isScanning = true;

    // Получаем текущий прогресс пользователя
    let currentStep = parseInt(localStorage.getItem('openHouseStep')) || 0;
    let expectedMarker = openHouseRoute[currentStep];

    if (markerValue === expectedMarker) {
        // Пользователь нашел правильный маркер по маршруту
        showInfoModal(openHouseHints[markerValue]);
        // Продвигаем прогресс
        if (currentStep < openHouseRoute.length - 1) {
            localStorage.setItem('openHouseStep', currentStep + 1);
        }
    } else if (openHouseRoute.indexOf(markerValue) < currentStep) {
        // Пользователь сканирует старый маркер, на котором уже был
        let nextMarker = openHouseRoute[currentStep];
        showInfoModal(`Ти тут вже був! Твоя наступна актуальна ціль: маркер №${nextMarker}.`);
    } else {
        // Пользователь нашел маркер из будущего (забежал вперед)
        showInfoModal(`Ти знайшов маркер №${markerValue}, але ти ще не пройшов попередні етапи!`);
    }
    return; // Прерываем выполнение, чтобы не отправлять запрос на сервер за призом
}