const { MongoClient } = require('mongodb');
const crypto = require('crypto');

class AdminStore {
  constructor({ mongoUrl, dbName = 'game-vr-bot', ownerChatId }) {
    this.client = new MongoClient(mongoUrl);
    this.dbName = dbName;
    this.ownerChatId = Number(ownerChatId);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    // TTL index: auto-delete expired invites
    await this.db.collection('invites').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
  }

  async isAdmin(chatId) {
    if (Number(chatId) === this.ownerChatId) return true;
    const admin = await this.db.collection('admins').findOne({ chatId: Number(chatId) });
    return !!admin;
  }

  async addAdmin(chatId, addedBy) {
    await this.db.collection('admins').updateOne(
      { chatId: Number(chatId) },
      { $set: { chatId: Number(chatId), addedBy: Number(addedBy), addedAt: new Date() } },
      { upsert: true }
    );
  }

  async removeAdmin(chatId) {
    if (Number(chatId) === this.ownerChatId) {
      throw new Error('Не можна видалити власника.');
    }
    await this.db.collection('admins').deleteOne({ chatId: Number(chatId) });
  }

  async listAdmins() {
    const admins = await this.db.collection('admins').find().toArray();
    const ownerExists = admins.some(a => a.chatId === this.ownerChatId);
    if (!ownerExists) {
      admins.unshift({ chatId: this.ownerChatId, addedBy: null, addedAt: null });
    }
    return admins;
  }

  async createInvite(createdBy) {
    const token = crypto.randomBytes(8).toString('hex');
    await this.db.collection('invites').insertOne({
      token,
      createdBy: Number(createdBy),
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
    });
    return token;
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
