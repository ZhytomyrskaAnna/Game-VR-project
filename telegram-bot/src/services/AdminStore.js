const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

class AdminStore {
  constructor({ region, adminsTable, invitesTable, ownerChatId }) {
    const client = new DynamoDBClient({ region });
    this.db = DynamoDBDocumentClient.from(client);
    this.adminsTable = adminsTable;
    this.invitesTable = invitesTable;
    this.ownerChatId = Number(ownerChatId);
  }

  async isAdmin(chatId) {
    if (Number(chatId) === this.ownerChatId) return true;
    const result = await this.db.send(new GetCommand({
      TableName: this.adminsTable,
      Key: { chatId: Number(chatId) },
    }));
    return !!result.Item;
  }

  async addAdmin(chatId, addedBy) {
    await this.db.send(new PutCommand({
      TableName: this.adminsTable,
      Item: {
        chatId: Number(chatId),
        addedBy: Number(addedBy),
        addedAt: new Date().toISOString(),
      },
    }));
  }

  async removeAdmin(chatId) {
    if (Number(chatId) === this.ownerChatId) {
      throw new Error('Не можна видалити власника.');
    }
    await this.db.send(new DeleteCommand({
      TableName: this.adminsTable,
      Key: { chatId: Number(chatId) },
    }));
  }

  async listAdmins() {
    const result = await this.db.send(new ScanCommand({
      TableName: this.adminsTable,
    }));
    const admins = result.Items || [];
    // Always include owner
    const ownerExists = admins.some(a => a.chatId === this.ownerChatId);
    if (!ownerExists) {
      admins.unshift({ chatId: this.ownerChatId, addedBy: null, addedAt: null });
    }
    return admins;
  }

  async createInvite(createdBy) {
    const token = uuidv4().slice(0, 8);
    const ttl = Math.floor(Date.now() / 1000) + 86400; // 24 hours
    await this.db.send(new PutCommand({
      TableName: this.invitesTable,
      Item: {
        token,
        createdBy: Number(createdBy),
        expiresAt: ttl,
      },
    }));
    return token;
  }

  async redeemInvite(token) {
    try {
      const result = await this.db.send(new DeleteCommand({
        TableName: this.invitesTable,
        Key: { token },
        ConditionExpression: 'attribute_exists(#t) AND #exp > :now',
        ExpressionAttributeNames: { '#t': 'token', '#exp': 'expiresAt' },
        ExpressionAttributeValues: { ':now': Math.floor(Date.now() / 1000) },
        ReturnValues: 'ALL_OLD',
      }));
      return result.Attributes?.createdBy ?? null;
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') return null;
      throw err;
    }
  }
}

module.exports = AdminStore;
