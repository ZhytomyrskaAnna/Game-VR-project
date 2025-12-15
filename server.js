
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const MAX_MARKER = 12;
let prizeMarker = -1;
let lastResetDate = null;

function generateNewPrizeMarker() {
    prizeMarker = Math.floor(Math.random() * (MAX_MARKER + 1));
    lastResetDate = new Date();
    console.log(`Новий маркер з призом: ${prizeMarker} о ${lastResetDate}`);
}

// Генерація при старті
if (prizeMarker === -1) {
    generateNewPrizeMarker();
}

// Перевірка кожну годину для тижневого оновлення
setInterval(() => {
    const now = new Date();
    const daysDiff = Math.floor((now - lastResetDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 7) {
        generateNewPrizeMarker();
    }
}, 60 * 60 * 1000);

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, 'index2.html'));
});

// Новий ендпоінт для перевірки маркера
app.post('/check-marker', (req, res) => {
    const scannedMarker = parseInt(req.body.marker);

    if (isNaN(scannedMarker) || scannedMarker < 0 || scannedMarker > MAX_MARKER) {
        return res.status(400).json({ 
            success: false,
            message: 'Wrong marker\nnumber.' 
        });
    }

    if (prizeMarker === -1) {
        return res.json({ 
            success: false,
            message: 'Prize has already been claimed.\nPlease wait for the next one.' 
        });
    }

    if (scannedMarker === prizeMarker) {
        const tempPrize = prizeMarker;
        prizeMarker = -1; // Приз забрано
        return res.json({ 
            success: true,
            message: '🎉 Congratulations!\nYou found the prize!',
            markerNumber: tempPrize
        });
    } else {
        return res.json({ 
            success: false,
            message: '❌ There is no prize here.\nTry another marker.',
            markerNumber: scannedMarker
        });
    }
});

// Ендпоінт для адміністратора (опціонально)
app.post('/admin/reset-prize', (req, res) => {
    generateNewPrizeMarker();
    res.json({ 
        success: true,
        message: 'New prize generated!' 
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});