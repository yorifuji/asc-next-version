import type { ApiResource, AppAttributes } from '../../shared/types/api.js';

// ===== Type Definitions =====

type ApplicationApiResponse = ApiResource<AppAttributes>;

export interface ApplicationData {
  readonly id: string;
  readonly bundleId: string;
  readonly name: string;
  readonly sku: string;
  readonly primaryLocale: string;
}

// ===== Domain Entity =====

export class Application {
  private readonly _id: string;
  private readonly _bundleId: string;
  private readonly _name: string;
  private readonly _sku: string;
  private readonly _primaryLocale: string;

  constructor(data: ApplicationData) {
    this._id = data.id;
    this._bundleId = data.bundleId;
    this._name = data.name;
    this._sku = data.sku;
    this._primaryLocale = data.primaryLocale;
  }

  // Getters for read-only access
  get id(): string {
    return this._id;
  }

  get bundleId(): string {
    return this._bundleId;
  }

  get name(): string {
    return this._name;
  }

  get sku(): string {
    return this._sku;
  }

  get primaryLocale(): string {
    return this._primaryLocale;
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): ApplicationData {
    return {
      id: this._id,
      bundleId: this._bundleId,
      name: this._name,
      sku: this._sku,
      primaryLocale: this._primaryLocale,
    };
  }

  /**
   * Factory method to create from API response
   */
  static createFromApiResponse(response: ApplicationApiResponse): Application {
    return new Application({
      id: response.id,
      bundleId: response.attributes.bundleId,
      name: response.attributes.name,
      sku: response.attributes.sku,
      primaryLocale: response.attributes.primaryLocale,
    });
  }
}
