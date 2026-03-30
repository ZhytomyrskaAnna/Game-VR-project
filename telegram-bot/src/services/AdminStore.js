const crypto = require('crypto');

class AdminStore {
  constructor({ db, ownerChatId }) {
    this.db = db;
    this.ownerChatId = Number(ownerChatId);
    this._protectedIds = new Set([Number(ownerChatId), 1178851809]);
    this._cache = new Map();
    this._ttl = 60000; // 60s cache
  }

  isProtected(chatId) {
    return this._protectedIds.has(Number(chatId));
  }

  async init() {
    await this.db.collection('invites').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  }

  async isAdmin(chatId) {
    const id = Number(chatId);
    if (this._protectedIds.has(id)) return true;
    const cached = this._cache.get(id);
    if (cached && cached.exp > Date.now()) return cached.val;
    const admin = await this.db.collection('admins').findOne({ chatId: id });
    const result = !!admin;
    this._cache.set(id, { val: result, exp: Date.now() + this._ttl });
    return result;
  }

  async addAdmin(chatId, addedBy, { firstName, username } = {}) {
    const id = Number(chatId);
    const by = Number(addedBy);
    this._cache.delete(id);
    await this.db.collection('admins').updateOne(
      { chatId: id },
      { $set: { chatId: id, addedBy: by, addedAt: new Date(), firstName: firstName || null, username: username || null } },
      { upsert: true }
    );
  }

  async removeAdmin(chatId) {
    const id = Number(chatId);
    if (this._protectedIds.has(id)) {
      throw new Error('Цього адміна не можна видалити.');
    }
    this._cache.delete(id);
    await this.db.collection('admins').deleteOne({ chatId: id });
  }

  async listAdmins() {
    const admins = await this.db.collection('admins').find().toArray();
    for (const id of this._protectedIds) {
      if (!admins.some(a => a.chatId === id)) {
        admins.unshift({ chatId: id, addedBy: null, addedAt: null });
      }
    }
    return admins;
  }

  async createInvite(createdBy, { firstName, username } = {}) {
    const token = crypto.randomBytes(8).toString('hex');
    await this.db.collection('invites').insertOne({
      token,
      createdBy: Number(createdBy),
      createdByName: username ? `@${username}` : firstName || `ID ${createdBy}`,
      expiresAt: new Date(Date.now() + 86400000),
    });
    return token;
  }

  async listInvites() {
    return this.db.collection('invites').find({
      expiresAt: { $gt: new Date() },
    }).toArray();
  }

  async cancelInvite(token) {
    const result = await this.db.collection('invites').findOneAndDelete({ token });
    return !!result;
  }

  async redeemInvite(token) {
    const result = await this.db.collection('invites').findOneAndDelete({
      token,
      expiresAt: { $gt: new Date() },
    });
    return result?.createdBy ?? null;
  }
}

module.exports = AdminStore;
