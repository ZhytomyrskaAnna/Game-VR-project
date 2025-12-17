const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const MAX_MARKER = 12;
let prizeMarker = -1;
let lastResetDate = null;

// --- ЛОГИКА ИГРЫ ---
function generateNewPrizeMarker() {
  prizeMarker = Math.floor(Math.random() * (MAX_MARKER + 1));
  lastResetDate = new Date();
  console.log(`Новий приз згенеровано: ${prizeMarker} о ${lastResetDate.toISOString()}`);
}

// Генерируем приз при запуске, если его нет
if (prizeMarker === -1) generateNewPrizeMarker();

// Проверка раз в час (сброс раз в неделю)
setInterval(() => {
  if (!lastResetDate) return;
  const now = new Date();
  const daysDiff = Math.floor((now - lastResetDate) / (1000 * 60 * 60 * 24));
  if (daysDiff >= 7) generateNewPrizeMarker();
}, 60 * 60 * 1000);

// --- НАСТРОЙКИ СЕРВЕРА ---
app.use(express.json());
app.use(cors());

// --- АВТОРИЗАЦИЯ (Basic Auth) ---
function basicAuth(req, res, next) {
  // Берем логин/пароль из настроек Render или используем дефолтные (только для тестов!)
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'secret123';

  const auth = req.headers['authorization'];

  if (!auth) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }

  // Разбираем заголовок "Basic base64string"
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic') {
    return res.status(401).send('Bad Request');
  }

  const creds = Buffer.from(parts[1], 'base64').toString().split(':');
  const user = creds[0];
  const pass = creds[1];

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    return next(); // Пароль верный, пропускаем
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Access denied');
}

// --- МАРШРУТЫ ---

// 1. Сначала обрабатываем API и Админку (порядок важен!)

// Защищенная страница админа
app.get('/admin', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Защищенные API действия админа
app.get('/admin/status', basicAuth, (req, res) => {
  res.json({ 
      success: true, 
      prizeMarker, 
      lastResetDate: lastResetDate ? lastResetDate.toISOString() : null, 
      isClaimed: prizeMarker === -1 
  });
});

app.post('/admin/reset-prize', basicAuth, (req, res) => {
  generateNewPrizeMarker();
  res.json({ success: true, message: 'Новий приз згенеровано!', prizeMarker });
});

// API проверки маркера (публичное)
app.post('/check-marker', (req, res) => {
  const scannedMarker = parseInt(req.body.marker, 10);
  
  if (isNaN(scannedMarker)) {
    return res.status(400).json({ success: false, message: 'Невірний формат даних.' });
  }

  if (prizeMarker === -1) {
    return res.json({ success: false, message: 'Приз вже знайдено! Чекайте на оновлення.', markerNumber: scannedMarker });
  }

  if (scannedMarker === prizeMarker) {
    const found = prizeMarker;
    prizeMarker = -1; // Приз забрали
    return res.json({ success: true, message: 'Вітаємо! Ви знайшли приз!', markerNumber: found });
  }

  return res.json({ success: false, message: 'Тут пусто. Шукайте далі!', markerNumber: scannedMarker });
});

// 2. Блокируем прямой доступ к файлу admin.html через адресную строку
app.use((req, res, next) => {
    if (req.path === '/admin.html') {
        return res.status(403).send('Access Denied. Use /admin route.');
    }
    next();
});

// 3. Отдаем статические файлы (index.html, css, js)
// Это должно быть В КОНЦЕ, чтобы не перекрыть API
app.use(express.static(path.join(__dirname)));

// Главная страница по умолчанию
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html'));
});

app.listen(port, () => console.log(`Server running on port ${port}`));