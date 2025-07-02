import { createValidationError } from '../../shared/errors/customErrors.js';
import { VERSION_REGEX } from '../../shared/constants/index.js';

/**
 * Value object representing a semantic version
 */
export class Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  private readonly _versionString: string;

  constructor(versionString: string) {
    if (!versionString || typeof versionString !== 'string') {
      throw createValidationError('Version must be a non-empty string', 'version', versionString);
    }

    if (!VERSION_REGEX.test(versionString)) {
      throw createValidationError(
        'Version must be in format X.Y.Z (e.g., 1.0.0)',
        'version',
        versionString,
      );
    }

    const parts = versionString.split('.').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw createValidationError(
        'Version must be in format X.Y.Z with valid numbers',
        'version',
        versionString,
      );
    }

    const [major, minor, patch] = parts;
    this.major = major!;
    this.minor = minor!;
    this.patch = patch!;
    this._versionString = versionString;
  }

  /**
   * Get the version as a string
   */
  toString(): string {
    return this._versionString;
  }

  /**
   * Create a new version with incremented patch number
   */
  incrementPatch(): Version {
    const newVersionString = `${this.major}.${this.minor}.${this.patch + 1}`;
    return new Version(newVersionString);
  }

  /**
   * Create a new version with incremented minor number
   */
  incrementMinor(): Version {
    const newVersionString = `${this.major}.${this.minor + 1}.0`;
    return new Version(newVersionString);
  }

  /**
   * Create a new version with incremented major number
   */
  incrementMajor(): Version {
    const newVersionString = `${this.major + 1}.0.0`;
    return new Version(newVersionString);
  }

  /**
   * Compare with another version
   * @returns {number} -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: Version): number {
    if (!(other instanceof Version)) {
      throw createValidationError('Can only compare with another Version instance', 'other', other);
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
  equals(other: Version): boolean {
    return this.compareTo(other) === 0;
  }
}
