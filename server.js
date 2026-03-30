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

// Изначальный маршрут для Дня открытых дверей (можно изменить через админку или ботом)
let currentOpenHouseRoute = [12, 28, 30, 13];
// Массив всех возможных маркеров для Дня открытых дверей (исключая 12)
const openHousePool = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

// --- ЛОКАЦІЇ (in-memory, дефолтні значення) ---
const locations = {
  12: 'Старт',
  13: 'Кабінет 1',
  14: 'Кабінет 2',
  15: 'Кабінет 3',
  16: 'Кабінет 4',
  17: 'Кабінет 5',
  18: 'Кабінет 6',
  19: 'Кабінет 7',
  20: 'Кабінет 8',
  21: 'Кабінет 9',
  22: 'Кабінет 10',
  23: 'Кабінет 11',
  24: 'Кабінет 12',
  25: 'Кабінет 13',
  26: 'Кабінет 14',
  27: 'Кабінет 15',
  28: 'Кафітерій',
  29: 'Задній двір',
  30: 'Холл',
};




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



// 5. Обнуление приза (бот: "приз знайдено")
app.post('/bot/claim-prize', (req, res) => {
    if (prizeMarker === -1) {
        return res.json({ success: false, message: 'Приз вже було забрано.' });
    }
    const claimed = prizeMarker;
    prizeMarker = -1;
    const claimTime = new Date().toLocaleString('uk-UA');
    console.log(`[${claimTime}] Бот обнулив приз. Маркер №${claimed}.`);
    res.json({ success: true, message: `Приз (маркер №${claimed}) обнулено.`, claimedMarker: claimed });
});

// 1. Клиент запрашивает актуальный маршрут
app.get('/api/open-house-route', (req, res) => {
    res.json({ success: true, route: currentOpenHouseRoute });
});

// 2. Бот задает конкретный маршрут
app.post('/bot/set-route', (req, res) => {
    const { route } = req.body;
    
    // Проверяем валидность: это массив и первый элемент всегда 12
    if (!Array.isArray(route) || route[0] !== 12) {
        return res.status(400).json({ success: false, message: 'Маршрут має бути масивом і починатися з 12.' });
    }
    
    currentOpenHouseRoute = route;
    console.log(`Бот встановив новий маршрут: ${currentOpenHouseRoute}`);
    res.json({ success: true, route: currentOpenHouseRoute });
});

// 3. Бот запрашивает генерацию рандомного маршрута
app.post('/bot/random-route', (req, res) => {
    const steps = req.body.steps || 5; // Количество шагов по умолчанию
    
    // Перемешиваем пул маркеров и берем нужное количество
    const shuffled = openHousePool.sort(() => 0.5 - Math.random());
    const randomPath = shuffled.slice(0, steps - 1);
    
    // Всегда начинаем с 12
    currentOpenHouseRoute = [12, ...randomPath];
    
    console.log(`Бот згенерував випадковий маршрут: ${currentOpenHouseRoute}`);
    res.json({ success: true, route: currentOpenHouseRoute });
});

// --- ЛОКАЦІЇ API ---

app.get('/api/locations', (req, res) => {
    res.json({ success: true, locations });
});

app.post('/api/locations', (req, res) => {
    const { markerId, name } = req.body;
    const id = Number(markerId);
    if (isNaN(id) || !name || typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'Потрібні markerId (число) та name (текст).' });
    }
    locations[id] = name.trim();
    console.log(`Локацію оновлено: маркер ${id} → "${locations[id]}"`);
    res.json({ success: true, markerId: id, name: locations[id] });
});

app.delete('/api/locations/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!(id in locations)) {
        return res.status(404).json({ success: false, message: 'Локацію не знайдено.' });
    }
    const name = locations[id];
    delete locations[id];
    console.log(`Локацію видалено: маркер ${id} ("${name}")`);
    res.json({ success: true, message: `Локацію "${name}" (маркер ${id}) видалено.` });
});

app.use(express.static(path.join(__dirname)));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'));
});

app.listen(port, () => console.log(`Server running on port ${port}`));

