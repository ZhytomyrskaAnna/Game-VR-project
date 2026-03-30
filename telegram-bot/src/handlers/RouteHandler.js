const { formatRoute } = require('../config/locations');

class RouteHandler {
  constructor(gameApi) {
    this.gameApi = gameApi;
    // chatId -> { route: [12, ...], locations: {...} }
    this.drafts = new Map();
  }

  async _getLocations() {
    const data = await this.gameApi.getLocations();
    return data.success ? data.locations : {};
  }

  async current(bot, chatId) {
    const [routeData, locations] = await Promise.all([
      this.gameApi.getCurrentRoute(),
      this._getLocations(),
    ]);
    if (!routeData.success) {
      await bot.sendMessage(chatId, 'Не вдалося отримати маршрут.');
      return;
    }
    await bot.sendMessage(chatId, `Поточний маршрут:\n${formatRoute(routeData.route, locations)}`);
  }

  async startCustom(bot, chatId) {
    const locations = await this._getLocations();
    this.drafts.set(chatId, { route: [12], locations });
    await this._sendPickerStep(bot, chatId);
  }

  async handlePick(bot, chatId, markerStr) {
    const draft = this.drafts.get(chatId);
    if (!draft) return;

    draft.route.push(Number(markerStr));
    await this._sendPickerStep(bot, chatId);
  }

  async finishCustom(bot, chatId) {
    const draft = this.drafts.get(chatId);
    if (!draft || draft.route.length < 2) {
      await bot.sendMessage(chatId, 'Потрібно обрати хоча б одну точку.');
      return;
    }

    await bot.sendMessage(chatId,
      `Маршрут:\n${formatRoute(draft.route, draft.locations)}\n\nЗберегти?`, {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Зберегти', callback_data: 'route_save' },
            { text: 'Скасувати', callback_data: 'route_cancel' },
          ]],
        },
      });
  }

  async save(bot, chatId) {
    const draft = this.drafts.get(chatId);
    if (!draft) {
      await bot.sendMessage(chatId, 'Немає маршруту для збереження.');
      return;
    }

    const { locations } = draft;
    const data = await this.gameApi.setRoute(draft.route);
    this.drafts.delete(chatId);

    if (data.success) {
      await bot.sendMessage(chatId, `Маршрут збережено!\n${formatRoute(data.route, locations)}`);
    } else {
      await bot.sendMessage(chatId, `Помилка: ${data.message}`);
    }
  }

  cancelDraft(chatId) {
    this.drafts.delete(chatId);
  }

  async _sendPickerStep(bot, chatId) {
    const draft = this.drafts.get(chatId);
    const { route, locations } = draft;
    const chosen = new Set(route);

    // Available markers: all location keys except 12 (Start) and already chosen
    const available = Object.keys(locations)
      .map(Number)
      .filter(m => m !== 12 && !chosen.has(m));

    let text = `Крок ${route.length}: обрано ${route.length - 1} точок.\n`;
    text += `Поточний: ${formatRoute(route, locations)}\n\nОберіть наступну точку:`;

    const rows = [];
    for (let i = 0; i < available.length; i += 3) {
      const row = available.slice(i, i + 3).map(m => ({
        text: locations[m] || `Маркер ${m}`,
        callback_data: `route_pick_${m}`,
      }));
      rows.push(row);
    }
    rows.push([{ text: 'Завершити', callback_data: 'route_finish' }]);

    await bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: rows },
    });
  }
}

module.exports = RouteHandler;
