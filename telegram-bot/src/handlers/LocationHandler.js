class LocationHandler {
  constructor(gameApi) {
    this.gameApi = gameApi;
    // chatId -> { action: 'edit'|'add', markerId?: number }
    this.pending = new Map();
  }

  async list(bot, chatId) {
    const data = await this.gameApi.getLocations();
    if (!data.success) {
      await bot.sendMessage(chatId, 'Не вдалося отримати локації.');
      return;
    }

    const entries = Object.entries(data.locations);
    if (entries.length === 0) {
      await bot.sendMessage(chatId, 'Локацій немає.');
      return;
    }

    let text = 'Локації:\n';
    const buttons = [];

    for (const [id, name] of entries) {
      text += `- Маркер ${id}: ${name}\n`;
      buttons.push([
        { text: `Редагувати "${name}"`, callback_data: `loc_edit_${id}` },
        { text: 'X', callback_data: `loc_del_${id}` },
      ]);
    }

    buttons.push([{ text: 'Додати нову', callback_data: 'loc_add' }]);
    buttons.push([{ text: 'Назад', callback_data: 'menu' }]);

    await bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: buttons },
    });
  }

  async promptEdit(bot, chatId, markerId) {
    this.pending.set(chatId, { action: 'edit', markerId: Number(markerId) });
    await bot.sendMessage(chatId, `Введіть нову назву для маркера ${markerId}:`);
  }

  async promptAdd(bot, chatId) {
    this.pending.set(chatId, { action: 'add' });
    await bot.sendMessage(chatId, 'Введіть ID маркера та назву через пробіл.\nНаприклад: 15 Бібліотека');
  }

  async confirmDelete(bot, chatId, markerId) {
    const data = await this.gameApi.getLocations();
    const name = data.locations?.[markerId] || `Маркер ${markerId}`;
    await bot.sendMessage(chatId, `Видалити "${name}" (маркер ${markerId})?`, {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Так', callback_data: `loc_confirm_del_${markerId}` },
          { text: 'Скасувати', callback_data: 'loc_list' },
        ]],
      },
    });
  }

  async deleteConfirm(bot, chatId, markerId) {
    const data = await this.gameApi.deleteLocation(markerId);
    await bot.sendMessage(chatId, data.message || 'Готово.');
  }

  hasPendingInput(chatId) {
    return this.pending.has(chatId);
  }

  clearPending(chatId) {
    this.pending.delete(chatId);
  }

  async handleTextInput(bot, chatId, text) {
    const state = this.pending.get(chatId);
    if (!state) return false;

    this.pending.delete(chatId);

    if (state.action === 'edit') {
      const data = await this.gameApi.updateLocation(state.markerId, text.trim());
      if (data.success) {
        await bot.sendMessage(chatId, `Локацію оновлено: маркер ${state.markerId} → "${data.name}"`);
      } else {
        await bot.sendMessage(chatId, `Помилка: ${data.message}`);
      }
      return true;
    }

    if (state.action === 'add') {
      const spaceIdx = text.indexOf(' ');
      if (spaceIdx === -1) {
        await bot.sendMessage(chatId, 'Невірний формат. Потрібно: ID назва\nНаприклад: 15 Бібліотека');
        return true;
      }
      const markerId = Number(text.slice(0, spaceIdx));
      const name = text.slice(spaceIdx + 1).trim();
      if (isNaN(markerId) || !name) {
        await bot.sendMessage(chatId, 'Невірний формат. Потрібно: ID назва');
        return true;
      }
      const data = await this.gameApi.updateLocation(markerId, name);
      if (data.success) {
        await bot.sendMessage(chatId, `Локацію додано: маркер ${markerId} → "${data.name}"`);
      } else {
        await bot.sendMessage(chatId, `Помилка: ${data.message}`);
      }
      return true;
    }

    return false;
  }
}

module.exports = LocationHandler;
