class AdminHandler {
  constructor(adminStore, botUsername) {
    this.adminStore = adminStore;
    this.botUsername = botUsername;
    this._pendingPasswords = new Set();
  }

  _displayName(admin) {
    if (admin.username) return `@${admin.username}`;
    if (admin.firstName) return admin.firstName;
    return `ID ${admin.chatId}`;
  }

  async invite(bot, chatId, from) {
    const token = await this.adminStore.createInvite(chatId, {
      firstName: from.first_name,
      username: from.username,
    });
    const link = `https://t.me/${this.botUsername}?start=inv_${token}`;
    await bot.sendMessage(chatId,
      `Посилання для запрошення адміна:\n\n${link}\n\nДійсне 24 години. Одноразове.`
    );
  }

  async handleInviteLink(bot, chatId, token, from) {
    const alreadyAdmin = await this.adminStore.isAdmin(chatId);
    if (alreadyAdmin) {
      await bot.sendMessage(chatId, 'Ви вже адмін.');
      return true;
    }

    const invitedBy = await this.adminStore.redeemInvite(token);
    if (!invitedBy) {
      await bot.sendMessage(chatId, 'Посилання недійсне або протерміноване.');
      return false;
    }

    await this.adminStore.addAdmin(chatId, invitedBy, {
      firstName: from.first_name,
      username: from.username,
    });
    await bot.sendMessage(chatId, `${from.first_name}, вас додано як адміна!`);
    return true;
  }

  async list(bot, chatId) {
    const admins = await this.adminStore.listAdmins();
    const adminsMap = {};
    admins.forEach(a => { adminsMap[a.chatId] = a; });

    let text = 'Адміни:\n';
    const buttons = [];

    for (const admin of admins) {
      const isProtected = this.adminStore.isProtected(admin.chatId);
      const name = this._displayName(admin);
      let label = isProtected ? `${name} (захищений)` : name;

      if (!isProtected && admin.addedBy) {
        const inviter = adminsMap[admin.addedBy];
        const inviterName = inviter ? this._displayName(inviter) : `ID ${admin.addedBy}`;
        label += ` ← ${inviterName}`;
      }

      text += `- ${label}\n`;

      if (!isProtected) {
        buttons.push([{
          text: `Видалити ${name}`,
          callback_data: `admin_remove_${admin.chatId}`,
        }]);
      }
    }

    const opts = buttons.length > 0
      ? { reply_markup: { inline_keyboard: buttons } }
      : {};

    await bot.sendMessage(chatId, text, opts);
  }

  async listInvites(bot, chatId) {
    const invites = await this.adminStore.listInvites();
    if (invites.length === 0) {
      await bot.sendMessage(chatId, 'Немає активних запрошень.');
      return;
    }

    let text = 'Активні запрошення:\n';
    const buttons = [];

    for (const inv of invites) {
      const timeLeft = Math.round((inv.expiresAt - Date.now()) / 3600000);
      text += `- ${inv.createdByName} (${timeLeft > 0 ? timeLeft + 'г' : '<1г'})\n`;
      buttons.push([{
        text: `Скасувати (${inv.createdByName})`,
        callback_data: `invite_cancel_${inv.token}`,
      }]);
    }

    buttons.push([{ text: 'Назад', callback_data: 'menu' }]);
    await bot.sendMessage(chatId, text, {
      reply_markup: { inline_keyboard: buttons },
    });
  }

  async cancelInvite(bot, chatId, token) {
    const cancelled = await this.adminStore.cancelInvite(token);
    await bot.sendMessage(chatId, cancelled ? 'Запрошення скасовано.' : 'Запрошення не знайдено.');
  }

  async remove(bot, chatId, targetChatId) {
    try {
      await this.adminStore.removeAdmin(targetChatId);
      await bot.sendMessage(chatId, 'Адміна видалено.');
    } catch (err) {
      await bot.sendMessage(chatId, err.message);
    }
  }

  async promptChangePassword(bot, chatId) {
    this._pendingPasswords.add(chatId);
    await bot.sendMessage(chatId, 'Введіть новий пароль для API (мінімум 4 символи):');
  }

  hasPendingPassword(chatId) {
    return this._pendingPasswords.has(chatId);
  }

  clearPendingPassword(chatId) {
    this._pendingPasswords.delete(chatId);
  }

  async handlePasswordInput(bot, chatId, text, gameApi) {
    this._pendingPasswords.delete(chatId);
    if (text.length < 4) {
      await bot.sendMessage(chatId, 'Пароль має бути мінімум 4 символи.');
      return;
    }
    const data = await gameApi.changePassword(text);
    if (data.success) {
      gameApi.apiPassword = text;
      await bot.sendMessage(chatId, 'Пароль API змінено.');
    } else {
      await bot.sendMessage(chatId, `Помилка: ${data.message}`);
    }
  }
}

module.exports = AdminHandler;
