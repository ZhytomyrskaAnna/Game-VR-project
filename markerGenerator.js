// 12 маркерів для полювання на призи (0-11) + 19 для відкритого дня (12-30) + 12 для командної гри (31-42)
const NUMBER_OF_MARKERS = 42;

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