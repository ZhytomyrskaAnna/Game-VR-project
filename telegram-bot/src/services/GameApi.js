class GameApi {
  constructor(serverUrl, apiPassword) {
    this.serverUrl = serverUrl;
    this.apiPassword = apiPassword;
  }

  async _request(method, path, body = null) {
    const options = {
      method,
      headers: { 'x-api-key': this.apiPassword },
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${this.serverUrl}${path}`, options);
    return res.json();
  }

  async getPrizeStatus() {
    return this._request('GET', '/admin/status');
  }

  async resetPrize() {
    return this._request('POST', '/admin/reset-prize');
  }

  async claimPrize() {
    return this._request('POST', '/bot/claim-prize');
  }

  async getCurrentRoute() {
    return this._request('GET', '/api/open-house-route');
  }

  async setRoute(route) {
    return this._request('POST', '/bot/set-route', { route });
  }

  async getLocations() {
    return this._request('GET', '/api/locations');
  }

  async updateLocation(markerId, name) {
    return this._request('POST', '/api/locations', { markerId, name });
  }

  async deleteLocation(markerId) {
    return this._request('DELETE', `/api/locations/${markerId}`);
  }

  async changePassword(newPassword) {
    return this._request('POST', '/admin/change-password', { newPassword });
  }
}

module.exports = GameApi;
