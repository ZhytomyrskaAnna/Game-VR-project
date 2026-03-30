class PrizeHandler {
  constructor(gameApi) {
    this.gameApi = gameApi;
  }

  async create(bot, chatId) {
    await bot.sendMessage(chatId, 'Згенерувати новий приз?', {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Так', callback_data: 'prize_create_confirm' },
          { text: 'Скасувати', callback_data: 'menu' },
        ]],
      },
    });
  }

  async createConfirm(bot, chatId) {
    const data = await this.gameApi.resetPrize();
    if (data.success) {
      await bot.sendMessage(chatId, `Новий приз згенеровано!\nМаркер: №${data.prizeMarker}`);
    } else {
      await bot.sendMessage(chatId, `Помилка: ${data.message || 'Невідома помилка'}`);
    }
  }

  async info(bot, chatId) {
    const data = await this.gameApi.getPrizeStatus();
    if (!data.success) {
      await bot.sendMessage(chatId, 'Не вдалося отримати статус.');
      return;
    }

    const status = data.isClaimed ? 'Знайдено (обнулено)' : 'Активний';
    const marker = data.isClaimed ? '---' : `№${data.prizeMarker}`;
    const created = data.lastResetDate
      ? new Date(data.lastResetDate).toLocaleString('uk-UA')
      : 'Невідомо';

    await bot.sendMessage(chatId,
      `Статус призу:\n` +
      `- Маркер: ${marker}\n` +
      `- Створено: ${created}\n` +
      `- Стан: ${status}`
    );
  }

  async claim(bot, chatId) {
    await bot.sendMessage(chatId, 'Обнулити приз (приз знайдено)?', {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Так, обнулити', callback_data: 'prize_claim_confirm' },
          { text: 'Скасувати', callback_data: 'menu' },
        ]],
      },
    });
  }

  async claimConfirm(bot, chatId) {
    const data = await this.gameApi.claimPrize();
    await bot.sendMessage(chatId, data.message);
  }
}

module.exports = PrizeHandler;
