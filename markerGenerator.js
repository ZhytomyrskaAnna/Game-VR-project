const NUMBER_OF_MARKERS = 13;

function generateMarkers() {
    
    const parentScene = document.querySelector('a-scene'); 

    if (!parentScene) {
        console.error("Помилка: Елемент <a-scene> не знайдено!");
        return;
    }

    for (let i = 0; i < NUMBER_OF_MARKERS; i++) {

        const marker = document.createElement('a-marker');
        
        marker.setAttribute('type', 'barcode');
        marker.setAttribute('value', i.toString());
        marker.setAttribute('prizeslots', '');
        
        parentScene.appendChild(marker);
    }

    console.log(`Успішно згенеровано ${NUMBER_OF_MARKERS} маркерів (від 0 до ${NUMBER_OF_MARKERS - 1}).`);
}


document.addEventListener('DOMContentLoaded', generateMarkers);