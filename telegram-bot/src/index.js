const TelegramBot = require('node-telegram-bot-api');
const AdminStore = require('./services/AdminStore');
const GameApi = require('./services/GameApi');
const Bot = require('./Bot');

const {
  BOT_TOKEN,
  SERVER_URL,
  OWNER_CHAT_ID,
  AWS_REGION = 'eu-central-1',
  DYNAMODB_ADMINS_TABLE = 'game-vr-bot-admins',
  DYNAMODB_INVITES_TABLE = 'game-vr-bot-invites',
} = process.env;

const telegramBot = new TelegramBot(BOT_TOKEN);
const adminStore = new AdminStore({
  region: AWS_REGION,
  adminsTable: DYNAMODB_ADMINS_TABLE,
  invitesTable: DYNAMODB_INVITES_TABLE,
  ownerChatId: OWNER_CHAT_ID,
});
const gameApi = new GameApi(SERVER_URL);

let botApp;

async function getBotApp() {
  if (botApp) return botApp;
  const me = await telegramBot.getMe();
  botApp = new Bot(telegramBot, {
    gameApi,
    adminStore,
    botUsername: me.username,
  });
  return botApp;
}

// AWS Lambda handler (webhook mode)
exports.handler = async (event) => {
  try {
    await getBotApp();
    const body = JSON.parse(event.body);
    await telegramBot.processUpdate(body);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Lambda error:', err);
    return { statusCode: 200, body: 'OK' }; // Always 200 to prevent Telegram retries
  }
};
