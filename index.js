const MAX_SLOT = 12; 
let prizeSlot = "-1"; 
let statusDisplay = document.getElementById("status-display");

function generateNewPrize() {

  const newSlotNumber = Math.floor(Math.random() * (MAX_SLOT + 1));
  
  prizeSlot = String(newSlotNumber);
  
  if (statusDisplay) {
      statusDisplay.textContent = "Статус: Приз заховано! Шукайте!";
  }
  
  alert("Новий секретний приз заховано! Розпочинайте пошук!");
  
  //console.log(`Секретний приз: ${prizeSlot}`));
}

document.addEventListener('DOMContentLoaded', generateNewPrize);


AFRAME.registerComponent('prizeslots', {
    init: function () 
    {
        let marker = this.el;

        marker.addEventListener('markerFound', function() {
          
          if (prizeSlot === "-1"){
            alert(" Приз ще не згенеровано або вже забрано. Натисніть кнопку.");
          } else if (prizeSlot === marker.getAttribute("value")){
            alert(" ВІТАЄМО! Приз знайдено!");
          } else {

            alert(" Тут немає призу. Спробуйте інший маркер.");
          } 
        });

        marker.addEventListener('markerLost', function() {
          
          if (prizeSlot === marker.getAttribute("value")){
            prizeSlot = "-1"; 
            

            if (statusDisplay) {
                statusDisplay.textContent = "Статус: Приз забрано! Згенеруйте новий.";
            }
            
            alert("Приз забрано! Щоб продовжити гру, згенеруйте новий приз!");
          }
        });
    }
});
