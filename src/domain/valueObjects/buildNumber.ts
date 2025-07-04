import { createValidationError } from '../../shared/errors/customErrors.js';

// ===== Build Number Value Object =====

const BUILD_NUMBER_PATTERN = /^\d+$/;
const MIN_BUILD_NUMBER = 0;

export class ApplicationBuildNumber {
  private readonly _value: number;

  constructor(value: string | number) {
    this._value = this._validateAndParse(value);
  }

  private _validateAndParse(value: string | number): number {
    // Handle string input
    if (typeof value === 'string') {
      if (!BUILD_NUMBER_PATTERN.test(value)) {
        throw createValidationError(
          `Build number must contain only digits: "${value}"`,
          'buildNumber',
          value,
        );
      }

      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw createValidationError(
          `Invalid build number format: "${value}"`,
          'buildNumber',
          value,
        );
      }

      return this._validateNumber(parsed);
    }

    // Handle number input
    return this._validateNumber(value);
  }

  private _validateNumber(value: number): number {
    if (!Number.isInteger(value)) {
      throw createValidationError(
        `Build number must be an integer: ${value}`,
        'buildNumber',
        value,
      );
    }

    if (value < MIN_BUILD_NUMBER) {
      throw createValidationError(
        'Build number must be a non-negative integer',
        'buildNumber',
        value,
      );
    }

    return value;
  }

  getValue(): number {
    return this._value;
  }

  toString(): string {
    return this._value.toString();
  }

  /**
   * Create a new build number incremented by specified amount
   */
  increment(by: number = 1): ApplicationBuildNumber {
    if (!Number.isInteger(by) || by < 1) {
      throw createValidationError('Increment value must be a positive integer', 'incrementBy', by);
    }
    return new ApplicationBuildNumber(this._value + by);
  }

  /**
   * Compare with another build number
   * Returns: negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other: ApplicationBuildNumber): number {
    if (!(other instanceof ApplicationBuildNumber)) {
      throw createValidationError(
        'Can only compare with another ApplicationBuildNumber instance',
        'other',
        other,
      );
    }

    return this._value - other._value;
  }

  equals(other: ApplicationBuildNumber): boolean {
    return this.compareTo(other) === 0;
  }

  isGreaterThan(other: ApplicationBuildNumber): boolean {
    return this.compareTo(other) > 0;
  }

  isLessThan(other: ApplicationBuildNumber): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Factory method to create from various input types
   */
  static create(value: ApplicationBuildNumber | string | number): ApplicationBuildNumber {
    if (value instanceof ApplicationBuildNumber) {
      return value;
    }
    return new ApplicationBuildNumber(value);
  }
}

// Backward compatibility alias
export { ApplicationBuildNumber as BuildNumber };

// Add backward compatibility static methods to BuildNumber
interface BuildNumberConstructor {
  from(value: ApplicationBuildNumber | string | number): ApplicationBuildNumber;
}
(ApplicationBuildNumber as unknown as BuildNumberConstructor).from = ApplicationBuildNumber.create;
