'use strict';

/**
 * Entity representing an App Store Connect app
 */
class App {
  constructor({ id, bundleId, name, sku, primaryLocale }) {
    this.id = id;
    this.bundleId = bundleId;
    this.name = name;
    this.sku = sku;
    this.primaryLocale = primaryLocale;
  }

  /**
   * Convert to plain object
   */
  toObject() {
    return {
      id: this.id,
      bundleId: this.bundleId,
      name: this.name,
      sku: this.sku,
      primaryLocale: this.primaryLocale,
    };
  }

  /**
   * Create from API response
   */
  static fromApiResponse(data) {
    return new App({
      id: data.id,
      bundleId: data.attributes.bundleId,
      name: data.attributes.name,
      sku: data.attributes.sku,
      primaryLocale: data.attributes.primaryLocale,
    });
  }
}

module.exports = App;
