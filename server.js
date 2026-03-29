const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;


const markerGroups = {
    prizeHunt: [0, 1, 2, 3, 4, 5,6, 7, 8, 9, 10, 11], // 12 маркерів для полювання на призи
    openHouse: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], // 12 маркерів для відкритого дня
    teamGame: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] // 12 маркерів для командної гри
};
let prizeMarker = -1;
let lastResetDate = null;

// --- ЛОГИКА ИГРЫ ---
function generateNewPrizeMarker() {
  const huntMarkers = markerGroups.prizeHunt;
  const randomIndex = Math.floor(Math.random() * huntMarkers.length);
  prizeMarker = huntMarkers[randomIndex];
  lastResetDate = new Date();
  console.log(`Новий приз згенеровано: ${prizeMarker} о ${lastResetDate.toISOString()}`);
}

if (prizeMarker === -1) generateNewPrizeMarker();

// Проверка раз в час
setInterval(() => {
  if (!lastResetDate) return;
  const now = new Date();
  const daysDiff = Math.floor((now - lastResetDate) / (1000 * 60 * 60 * 24));
  if (daysDiff >= 7) generateNewPrizeMarker();
}, 60 * 60 * 1000);

// --- НАСТРОЙКИ СЕРВЕРА ---
app.use(express.json());
app.use(cors());

// --- МАРШРУТЫ (БЕЗ ПАРОЛЯ) ---

// 1. Страница админа
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 2. Статус админа
app.get('/admin/status', (req, res) => {
  res.json({ 
      success: true, 
      prizeMarker, 
      lastResetDate: lastResetDate ? lastResetDate.toISOString() : null, 
      isClaimed: prizeMarker === -1 
  });
});

// 3. Генерация нового приза
app.post('/admin/reset-prize', (req, res) => {
  generateNewPrizeMarker();
  res.json({ success: true, message: 'Новий приз згенеровано!', prizeMarker });
});

// 4. Проверка маркера (для игры)
app.post('/check-marker', (req, res) => {
  const scannedMarker = Number.parseInt(req.body.marker, 10);
  
  if (Number.isNaN(scannedMarker)) {
    return res.status(400).json({ success: false, message: 'Невірний формат даних.' });
  }

  if (prizeMarker === -1) {
    return res.json({ success: false, message: 'Приз вже знайдено! Чекайте на оновлення.', markerNumber: scannedMarker });
  }

  if (scannedMarker === prizeMarker) {
    const found = prizeMarker;
    prizeMarker = -1; // Приз забрали
    // console.log(`Приз знайдено: ${found} о ${new Date().toISOString()}`);
    const claimTime = new Date().toLocaleString('uk-UA');
    console.log(`[${claimTime}] ПРИЗ ЗАБРАЛИ! Маркер №${found} тепер порожній.`);
    return res.json({ success: true, message: 'Вітаємо! Ви знайшли приз!', markerNumber: found });
  }

  return res.json({ success: false, message: 'Тут пусто. Шукайте далі!', markerNumber: scannedMarker });
});


app.use(express.static(path.join(__dirname)));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'));
});

app.listen(port, () => console.log(`Server running on port ${port}`));