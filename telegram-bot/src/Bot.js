const PrizeHandler = require('./handlers/PrizeHandler');
const RouteHandler = require('./handlers/RouteHandler');
const AdminHandler = require('./handlers/AdminHandler');
const LocationHandler = require('./handlers/LocationHandler');

class Bot {
  constructor(telegramBot, { gameApi, adminStore, botUsername }) {
    this.bot = telegramBot;
    this.adminStore = adminStore;
    this.prize = new PrizeHandler(gameApi);
    this.route = new RouteHandler(gameApi);
    this.admin = new AdminHandler(adminStore, botUsername);
    this.location = new LocationHandler(gameApi);

    this._registerHandlers();
  }

  _log(msg, action) {
    const user = msg.from?.username ? `@${msg.from.username}` : msg.from?.first_name || msg.chat.id;
    console.log(`[BOT] ${user} → ${action}`);
  }

  _registerHandlers() {
    this.bot.on('message', (msg) => this._onMessage(msg).catch(err => console.error('[BOT] Message error:', err.message)));
    this.bot.on('callback_query', (query) => this._onCallback(query).catch(err => console.error('[BOT] Callback error:', err.message)));
  }

  async _onMessage(msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();

    // Handle /start with invite token
    if (text.startsWith('/start inv_')) {
      this._log(msg, 'invite link');
      const token = text.replace('/start inv_', '');
      const success = await this.admin.handleInviteLink(
        this.bot, chatId, token, msg.from
      );
      if (success) await this._sendMenu(chatId);
      return;
    }

    // Handle /start
    if (text === '/start') {
      const isAdmin = await this.adminStore.isAdmin(chatId);
      if (!isAdmin) {
        this._log(msg, '/start (no access)');
        await this.bot.sendMessage(chatId, 'У вас немає доступу. Попросіть адміна надіслати запрошення.');
        return;
      }
      this._log(msg, '/start');
      // Update admin profile (name/username) on each /start
      await this.adminStore.addAdmin(chatId, chatId, {
        firstName: msg.from.first_name,
        username: msg.from.username,
      });
      await this._sendMenu(chatId);
      return;
    }

    // Handle pending text input (location edit/add)
    if (text && !text.startsWith('/')) {
      const isAdmin = await this.adminStore.isAdmin(chatId);
      if (!isAdmin) return;

      if (this.location.hasPendingInput(chatId)) {
        await this.location.handleTextInput(this.bot, chatId, text);
        return;
      }
    }
  }

  async _onCallback(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    // Auth check
    const isAdmin = await this.adminStore.isAdmin(chatId);
    if (!isAdmin) {
      await this.bot.answerCallbackQuery(query.id, { text: 'Немає доступу.' });
      return;
    }

    await this.bot.answerCallbackQuery(query.id);
    this._log(query.message, data);

    // Clear pending location input on any button press
    this.location.clearPending(chatId);

    // Menu
    if (data === 'menu') {
      await this._sendMenu(chatId);
      return;
    }

    // Prize
    if (data === 'prize_create') return this.prize.create(this.bot, chatId);
    if (data === 'prize_create_confirm') return this.prize.createConfirm(this.bot, chatId);
    if (data === 'prize_info') return this.prize.info(this.bot, chatId);
    if (data === 'prize_claim') return this.prize.claim(this.bot, chatId);
    if (data === 'prize_claim_confirm') return this.prize.claimConfirm(this.bot, chatId);

    // Route
    if (data === 'route_current') return this.route.current(this.bot, chatId);
    if (data === 'route_custom') return this.route.startCustom(this.bot, chatId);
    if (data === 'route_finish') return this.route.finishCustom(this.bot, chatId);
    if (data === 'route_save') return this.route.save(this.bot, chatId);
    if (data === 'route_cancel') {
      this.route.cancelDraft(chatId);
      await this._sendMenu(chatId);
      return;
    }
    if (data.startsWith('route_pick_')) {
      const marker = data.replace('route_pick_', '');
      return this.route.handlePick(this.bot, chatId, marker);
    }

    // Locations
    if (data === 'loc_list') return this.location.list(this.bot, chatId);
    if (data === 'loc_add') return this.location.promptAdd(this.bot, chatId);
    if (data.startsWith('loc_edit_')) {
      const markerId = data.replace('loc_edit_', '');
      return this.location.promptEdit(this.bot, chatId, markerId);
    }
    if (data.startsWith('loc_confirm_del_')) {
      const markerId = data.replace('loc_confirm_del_', '');
      return this.location.deleteConfirm(this.bot, chatId, markerId);
    }
    if (data.startsWith('loc_del_')) {
      const markerId = data.replace('loc_del_', '');
      return this.location.confirmDelete(this.bot, chatId, markerId);
    }

    // Admin
    if (data === 'admin_invite') return this.admin.invite(this.bot, chatId);
    if (data === 'admin_list') return this.admin.list(this.bot, chatId);
    if (data.startsWith('admin_remove_')) {
      const targetId = data.replace('admin_remove_', '');
      return this.admin.remove(this.bot, chatId, Number(targetId));
    }
  }

  async _sendMenu(chatId) {
    await this.bot.sendMessage(chatId, 'Головне меню:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Новий приз', callback_data: 'prize_create' },
            { text: 'Інфо про приз', callback_data: 'prize_info' },
          ],
          [
            { text: 'Приз знайдено', callback_data: 'prize_claim' },
          ],
          [
            { text: 'Свій маршрут', callback_data: 'route_custom' },
            { text: 'Поточний маршрут', callback_data: 'route_current' },
          ],
          [
            { text: 'Локації', callback_data: 'loc_list' },
          ],
          [
            { text: 'Запросити адміна', callback_data: 'admin_invite' },
            { text: 'Список адмінів', callback_data: 'admin_list' },
          ],
        ],
      },
    });
  }
}

module.exports = Bot;
