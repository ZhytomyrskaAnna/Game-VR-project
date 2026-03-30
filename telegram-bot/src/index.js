const TelegramBot = require('node-telegram-bot-api');
const AdminStore = require('./services/AdminStore');
const GameApi = require('./services/GameApi');
const Bot = require('./Bot');

async function initBot(app, db) {
  const {
    BOT_TOKEN,
    SERVER_URL,
    OWNER_CHAT_ID,
  } = process.env;

  if (!BOT_TOKEN) {
    console.log('BOT_TOKEN not set, Telegram bot disabled.');
    return;
  }

  const adminStore = new AdminStore({ db, ownerChatId: OWNER_CHAT_ID });
  await adminStore.init();

  const telegramBot = new TelegramBot(BOT_TOKEN);
  const port = process.env.PORT || 3000;
  const gameApi = new GameApi(`http://localhost:${port}`);

  const me = await telegramBot.getMe();
  new Bot(telegramBot, {
    gameApi,
    adminStore,
    botUsername: me.username,
  });

  // Webhook route
  app.post(`/webhook/${BOT_TOKEN}`, (req, res) => {
    telegramBot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Set webhook
  const baseUrl = SERVER_URL.replace(/\/+$/, '');
  const webhookUrl = `${baseUrl}/webhook/${BOT_TOKEN}`;
  await telegramBot.setWebHook(webhookUrl);
  console.log(`Telegram bot @${me.username} webhook set: ${webhookUrl}`);

  // Return notify function for server to use
  return async function notifyAdmins(message) {
    try {
      const admins = await adminStore.listAdmins();
      await Promise.allSettled(
        admins.map(a => telegramBot.sendMessage(a.chatId, message, { parse_mode: 'HTML' }))
      );
    } catch (err) {
      console.error('Notify admins failed:', err.message);
    }
  };
}

module.exports = initBot;
