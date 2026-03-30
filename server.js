const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

const markerGroups = {
    prizeHunt: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    openHouse: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
    teamGame: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]
};
const openHousePool = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

const DEFAULT_LOCATIONS = {
  12: 'Старт', 13: 'Кабінет 1', 14: 'Кабінет 2', 15: 'Кабінет 3',
  16: 'Кабінет 4', 17: 'Кабінет 5', 18: 'Кабінет 6', 19: 'Кабінет 7',
  20: 'Кабінет 8', 21: 'Кабінет 9', 22: 'Кабінет 10', 23: 'Кабінет 11',
  24: 'Кабінет 12', 25: 'Кабінет 13', 26: 'Кабінет 14', 27: 'Кабінет 15',
  28: 'Кафітерій', 29: 'Задній двір', 30: 'Холл',
};

let db;

// --- HELPERS ---
const game = () => db.collection('game');
const locs = () => db.collection('locations');

async function getPrize() {
  return await game().findOne({ _id: 'prize' });
}

async function generateNewPrizeMarker() {
  const huntMarkers = markerGroups.prizeHunt;
  const marker = huntMarkers[Math.floor(Math.random() * huntMarkers.length)];
  const now = new Date();
  await game().updateOne(
    { _id: 'prize' },
    { $set: { prizeMarker: marker, lastResetDate: now, isClaimed: false } },
    { upsert: true }
  );
  console.log(`Новий приз згенеровано: ${marker} о ${now.toLocaleString('uk-UA')}`);
  return marker;
}

async function getRoute() {
  const doc = await game().findOne({ _id: 'route' });
  return doc?.route || [12, 28, 30, 13];
}

async function setRoute(route) {
  await game().updateOne(
    { _id: 'route' },
    { $set: { route } },
    { upsert: true }
  );
}

async function getLocations() {
  const docs = await locs().find().toArray();
  const result = {};
  docs.forEach(d => { result[d.markerId] = d.name; });
  return result;
}

async function seedDefaults() {
  // Seed locations if empty
  const count = await locs().countDocuments();
  if (count === 0) {
    const docs = Object.entries(DEFAULT_LOCATIONS).map(([id, name]) => ({
      markerId: Number(id), name
    }));
    await locs().insertMany(docs);
    console.log('Default locations seeded.');
  }
  // Seed prize if not exists
  const prize = await getPrize();
  if (!prize) {
    await generateNewPrizeMarker();
  }
}

// --- НАСТРОЙКИ СЕРВЕРА ---
app.use(express.json());
app.use(cors());

// --- МАРШРУТЫ ---

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/status', async (req, res) => {
  const prize = await getPrize();
  res.json({
    success: true,
    prizeMarker: prize?.prizeMarker ?? -1,
    lastResetDate: prize?.lastResetDate || null,
    isClaimed: prize?.isClaimed ?? true
  });
});

app.post('/admin/reset-prize', async (req, res) => {
  const marker = await generateNewPrizeMarker();
  res.json({ success: true, message: 'Новий приз згенеровано!', prizeMarker: marker });
});

app.post('/check-marker', async (req, res) => {
  const scannedMarker = Number.parseInt(req.body.marker, 10);
  if (Number.isNaN(scannedMarker)) {
    return res.status(400).json({ success: false, message: 'Невірний формат даних.' });
  }

  const prize = await getPrize();
  if (!prize || prize.isClaimed) {
    return res.json({ success: false, message: 'Приз вже знайдено! Чекайте на оновлення.', markerNumber: scannedMarker });
  }

  if (scannedMarker === prize.prizeMarker) {
    await game().updateOne({ _id: 'prize' }, { $set: { isClaimed: true } });
    console.log(`[${new Date().toLocaleString('uk-UA')}] ПРИЗ ЗАБРАЛИ! Маркер №${prize.prizeMarker} тепер порожній.`);
    return res.json({ success: true, message: 'Вітаємо! Ви знайшли приз!', markerNumber: prize.prizeMarker });
  }

  return res.json({ success: false, message: 'Тут пусто. Шукайте далі!', markerNumber: scannedMarker });
});

app.post('/bot/claim-prize', async (req, res) => {
  const prize = await getPrize();
  if (!prize || prize.isClaimed) {
    return res.json({ success: false, message: 'Приз вже було забрано.' });
  }
  await game().updateOne({ _id: 'prize' }, { $set: { isClaimed: true } });
  console.log(`[${new Date().toLocaleString('uk-UA')}] Бот обнулив приз. Маркер №${prize.prizeMarker}.`);
  res.json({ success: true, message: `Приз (маркер №${prize.prizeMarker}) обнулено.`, claimedMarker: prize.prizeMarker });
});

app.get('/api/open-house-route', async (req, res) => {
  const route = await getRoute();
  res.json({ success: true, route });
});

app.post('/bot/set-route', async (req, res) => {
  const { route } = req.body;
  if (!Array.isArray(route) || route[0] !== 12) {
    return res.status(400).json({ success: false, message: 'Маршрут має бути масивом і починатися з 12.' });
  }
  await setRoute(route);
  console.log(`Бот встановив новий маршрут: ${route}`);
  res.json({ success: true, route });
});

app.post('/bot/random-route', async (req, res) => {
  const steps = req.body.steps || 5;
  const shuffled = [...openHousePool].sort(() => 0.5 - Math.random());
  const route = [12, ...shuffled.slice(0, steps - 1)];
  await setRoute(route);
  console.log(`Бот згенерував випадковий маршрут: ${route}`);
  res.json({ success: true, route });
});

// --- ЛОКАЦІЇ API ---

app.get('/api/locations', async (req, res) => {
  const locations = await getLocations();
  res.json({ success: true, locations });
});

app.post('/api/locations', async (req, res) => {
  const { markerId, name } = req.body;
  const id = Number(markerId);
  if (isNaN(id) || !name || typeof name !== 'string') {
    return res.status(400).json({ success: false, message: 'Потрібні markerId (число) та name (текст).' });
  }
  const trimmed = name.trim();
  await locs().updateOne(
    { markerId: id },
    { $set: { markerId: id, name: trimmed } },
    { upsert: true }
  );
  console.log(`Локацію оновлено: маркер ${id} → "${trimmed}"`);
  res.json({ success: true, markerId: id, name: trimmed });
});

app.delete('/api/locations/:id', async (req, res) => {
  const id = Number(req.params.id);
  const result = await locs().findOneAndDelete({ markerId: id });
  if (!result) {
    return res.status(404).json({ success: false, message: 'Локацію не знайдено.' });
  }
  console.log(`Локацію видалено: маркер ${id} ("${result.name}")`);
  res.json({ success: true, message: `Локацію "${result.name}" (маркер ${id}) видалено.` });
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index2.html'));
});

// --- STARTUP ---
async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db('game-vr-bot');
    await seedDefaults();
    console.log('MongoDB connected.');
  } else {
    console.error('MONGODB_URI not set!');
  }

  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    try {
      const initBot = require('./telegram-bot/src/index');
      await initBot(app, db);
    } catch (err) {
      console.error('Telegram bot init failed:', err.message);
    }
  });

  // Auto-reset prize every 7 days
  setInterval(async () => {
    const prize = await getPrize();
    if (!prize?.lastResetDate) return;
    const days = Math.floor((Date.now() - new Date(prize.lastResetDate)) / 86400000);
    if (days >= 7) await generateNewPrizeMarker();
  }, 3600000);
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
