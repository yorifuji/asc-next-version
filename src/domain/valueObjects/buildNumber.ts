import { createValidationError } from '../../shared/errors/customErrors.js';

/**
 * Value object representing a build number
 */
export class BuildNumber {
  private readonly _value: number;

  constructor(value: string | number) {
    let parsedValue = value;

    if (typeof value === 'string') {
      // Check if string contains only digits
      if (!/^\d+$/.test(value)) {
        throw createValidationError(
          'Build number must be a non-negative integer',
          'buildNumber',
          value,
        );
      }
      parsedValue = parseInt(value, 10);
    }

    if (typeof parsedValue !== 'number' || !Number.isInteger(parsedValue) || parsedValue < 0) {
      throw createValidationError(
        'Build number must be a non-negative integer',
        'buildNumber',
        value,
      );
    }

    this._value = parsedValue as number;
  }

  /**
   * Get the build number value
   */
  getValue(): number {
    return this._value;
  }

  /**
   * Get the build number as a string
   */
  toString(): string {
    return String(this._value);
  }

  /**
   * Create a new build number incremented by 1
   */
  increment(): BuildNumber {
    return new BuildNumber(this._value + 1);
  }

  /**
   * Compare with another build number
   */
  compareTo(other: BuildNumber): number {
    if (!(other instanceof BuildNumber)) {
      throw createValidationError(
        'Can only compare with another BuildNumber instance',
        'other',
        other,
      );
    }

    return this._value - other._value;
  }

  /**
   * Check if build numbers are equal
   */
  equals(other: BuildNumber): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * Check if this build number is greater than another
   */
  isGreaterThan(other: BuildNumber): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Create a BuildNumber from various input types
   */
  static from(value: BuildNumber | string | number): BuildNumber {
    if (value instanceof BuildNumber) {
      return value;
    }
    return new BuildNumber(value);
  }
}
