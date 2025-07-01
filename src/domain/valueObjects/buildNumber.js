'use strict';

const { ValidationError } = require('../../shared/errors/customErrors');

/**
 * Value object representing a build number
 */
class BuildNumber {
  constructor(value) {
    let parsedValue = value;

    if (typeof value === 'string') {
      // Check if string contains only digits
      if (!/^\d+$/.test(value)) {
        throw new ValidationError(
          'Build number must be a non-negative integer',
          'buildNumber',
          value,
        );
      }
      parsedValue = parseInt(value, 10);
    }

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      throw new ValidationError(
        'Build number must be a non-negative integer',
        'buildNumber',
        value,
      );
    }

    this._value = parsedValue;
  }

  /**
   * Get the build number value
   */
  getValue() {
    return this._value;
  }

  /**
   * Get the build number as a string
   */
  toString() {
    return String(this._value);
  }

  /**
   * Create a new build number incremented by 1
   */
  increment() {
    return new BuildNumber(this._value + 1);
  }

  /**
   * Compare with another build number
   */
  compareTo(other) {
    if (!(other instanceof BuildNumber)) {
      throw new ValidationError(
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
  equals(other) {
    return this.compareTo(other) === 0;
  }

  /**
   * Check if this build number is greater than another
   */
  isGreaterThan(other) {
    return this.compareTo(other) > 0;
  }

  /**
   * Create a BuildNumber from various input types
   */
  static from(value) {
    if (value instanceof BuildNumber) {
      return value;
    }
    return new BuildNumber(value);
  }
}

module.exports = BuildNumber;
