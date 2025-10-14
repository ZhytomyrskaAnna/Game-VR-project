const express = require('express');
const cors = require('cors'); // Для дозволу запитів з іншого домену
const app = express();
const port = process.env.PORT || 3000;

let secretNumber = -1; // Ініціалізуємо як -1, щоб при першому запуску згенерувалося число
let lastResetDate = null; // Для відстеження останнього скидання

// Функція для генерації нового секретного числа
function generateNewSecretNumber() {
    secretNumber = Math.floor(Math.random() * 30) + 1;
    lastResetDate = new Date();
    console.log(`Нове секретне число згенеровано: ${secretNumber} о ${lastResetDate}`);
}

// Перевірка та генерація числа при запуску сервера
if (secretNumber === -1) {
    generateNewSecretNumber();
}

// Заплановане завдання для оновлення числа раз на добу
setInterval(() => {
    const now = new Date();
    // Перевіряємо, чи пройшла вже одна доба з моменту останнього скидання
    if (lastResetDate && (now.getDate() !== lastResetDate.getDate() || now.getTime() - lastResetDate.getTime() >= 24 * 60 * 60 * 1000)) {
        generateNewSecretNumber();
    }
}, 60 * 60 * 1000); // Перевіряємо щогодини

// Middleware для обробки JSON-тіла запитів
app.use(express.json());
// Дозволити CORS для всіх джерел (для розробки, в продакшені краще обмежити)
app.use(cors());

// Обробка POST-запиту від клієнта
app.post('/guess', (req, res) => {
    const clientGuess = parseInt(req.body.number);

    if (isNaN(clientGuess) || clientGuess < 1 || clientGuess > 30) {
        return res.status(400).json({ message: 'Будь ласка, введіть число від 1 до 30.' });
    }

    if (secretNumber === -1) {
        return res.json({ message: 'Число вже було вгадано іншим гравцем. Спробуйте завтра!' });
    }

    if (clientGuess === secretNumber) {
        secretNumber = -1; // Число вгадано, змінюємо на -1
        return res.json({ message: 'Вітаємо! Ви вгадали число!' });
    } else {
        return res.json({ message: `На жаль, ви не вгадали. Спробуйте ще раз! Ваше число: ${clientGuess}` });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущено на http://localhost:${port}`);
});
