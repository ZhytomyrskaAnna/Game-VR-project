class AdminHandler {
  constructor(adminStore, botUsername) {
    this.adminStore = adminStore;
    this.botUsername = botUsername;
  }

  _displayName(admin) {
    if (admin.username) return `@${admin.username}`;
    if (admin.firstName) return admin.firstName;
    return `ID ${admin.chatId}`;
  }

  async invite(bot, chatId) {
    const token = await this.adminStore.createInvite(chatId);
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
    if (admins.length === 0) {
      await bot.sendMessage(chatId, 'Список адмінів порожній.');
      return;
    }

    let text = 'Адміни:\n';
    const buttons = [];

    for (const admin of admins) {
      const isOwner = admin.chatId === this.adminStore.ownerChatId;
      const name = this._displayName(admin);
      const label = isOwner ? `${name} (власник)` : name;
      text += `- ${label}\n`;

      if (!isOwner) {
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

  async remove(bot, chatId, targetChatId) {
    try {
      await this.adminStore.removeAdmin(targetChatId);
      await bot.sendMessage(chatId, `Адміна видалено.`);
    } catch (err) {
      await bot.sendMessage(chatId, err.message);
    }
  }
}

module.exports = AdminHandler;
