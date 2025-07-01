'use strict';

const { ValidationError } = require('../../shared/errors/customErrors');
const { VERSION_REGEX } = require('../../shared/constants');

/**
 * Value object representing a semantic version
 */
class Version {
  constructor(versionString) {
    if (!versionString || typeof versionString !== 'string') {
      throw new ValidationError('Version must be a non-empty string', 'version', versionString);
    }

    if (!VERSION_REGEX.test(versionString)) {
      throw new ValidationError(
        'Version must be in format X.Y.Z (e.g., 1.0.0)',
        'version',
        versionString,
      );
    }

    const [major, minor, patch] = versionString.split('.').map(Number);
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this._versionString = versionString;
  }

  /**
   * Get the version as a string
   */
  toString() {
    return this._versionString;
  }

  /**
   * Create a new version with incremented patch number
   */
  incrementPatch() {
    const newVersionString = `${this.major}.${this.minor}.${this.patch + 1}`;
    return new Version(newVersionString);
  }

  /**
   * Create a new version with incremented minor number
   */
  incrementMinor() {
    const newVersionString = `${this.major}.${this.minor + 1}.0`;
    return new Version(newVersionString);
  }

  /**
   * Create a new version with incremented major number
   */
  incrementMajor() {
    const newVersionString = `${this.major + 1}.0.0`;
    return new Version(newVersionString);
  }

  /**
   * Compare with another version
   * @returns {number} -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other) {
    if (!(other instanceof Version)) {
      throw new ValidationError('Can only compare with another Version instance', 'other', other);
    }

    if (this.major !== other.major) {
      return this.major > other.major ? 1 : -1;
    }
    if (this.minor !== other.minor) {
      return this.minor > other.minor ? 1 : -1;
    }
    if (this.patch !== other.patch) {
      return this.patch > other.patch ? 1 : -1;
    }
    return 0;
  }

  /**
   * Check if versions are equal
   */
  equals(other) {
    return this.compareTo(other) === 0;
  }
}

module.exports = Version;
