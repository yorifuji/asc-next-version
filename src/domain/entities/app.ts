interface AppParams {
  id: string;
  bundleId: string;
  name: string;
  sku: string;
  primaryLocale: string;
}

interface ApiResponseData {
  id: string;
  attributes: {
    bundleId: string;
    name: string;
    sku: string;
    primaryLocale: string;
  };
}

/**
 * Entity representing an App Store Connect app
 */
export class App {
  id: string;
  bundleId: string;
  name: string;
  sku: string;
  primaryLocale: string;

  constructor({ id, bundleId, name, sku, primaryLocale }: AppParams) {
    this.id = id;
    this.bundleId = bundleId;
    this.name = name;
    this.sku = sku;
    this.primaryLocale = primaryLocale;
  }

  /**
   * Convert to plain object
   */
  toObject(): AppParams {
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
  static fromApiResponse(data: ApiResponseData): App {
    return new App({
      id: data.id,
      bundleId: data.attributes.bundleId,
      name: data.attributes.name,
      sku: data.attributes.sku,
      primaryLocale: data.attributes.primaryLocale,
    });
  }
}
