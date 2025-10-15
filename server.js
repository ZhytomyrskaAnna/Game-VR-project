const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

let secretNumber = -1;
let lastResetDate = null;

function generateNewSecretNumber() {
    secretNumber = Math.floor(Math.random() * 30) + 1;
    lastResetDate = new Date();
    console.log(`Нове секретне число згенеровано: ${secretNumber} о ${lastResetDate}`);
}

if (secretNumber === -1) {
    generateNewSecretNumber();
}

setInterval(() => {
    const now = new Date();
    if (lastResetDate && (now.getDate() !== lastResetDate.getDate() || now.getTime() - lastResetDate.getTime() >= 24 * 60 * 60 * 1000)) {
        generateNewSecretNumber();
    }
}, 60 * 60 * 1000);

app.use(express.json());
app.use(cors());

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/guess', (req, res) => {
    const clientGuess = parseInt(req.body.number);

    if (isNaN(clientGuess) || clientGuess < 1 || clientGuess > 30) {
        return res.status(400).json({ message: 'Будь ласка, введіть число від 1 до 30.' });
    }

    if (secretNumber === -1) {
        return res.json({ message: 'Число вже було вгадано іншим гравцем. Спробуйте завтра!' });
    }

    if (clientGuess === secretNumber) {
        secretNumber = -1;
        return res.json({ message: 'Вітаємо! Ви вгадали число!' });
    } else {
        return res.json({ message: `На жаль, ви не вгадали. Спробуйте ще раз! Ваше число: ${clientGuess}` });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});