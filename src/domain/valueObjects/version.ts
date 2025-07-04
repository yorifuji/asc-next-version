import { createValidationError } from '../../shared/errors/customErrors.js';
import { SEMANTIC_VERSION_PATTERN } from '../../shared/constants/index.js';

// ===== Semantic Version Value Object =====

export class SemanticVersion {
  private readonly _major: number;
  private readonly _minor: number;
  private readonly _patch: number;
  private readonly _normalized: string;

  constructor(versionString: string) {
    const parsed = this._parse(versionString);
    this._major = parsed.major;
    this._minor = parsed.minor;
    this._patch = parsed.patch;
    this._normalized = `${this._major}.${this._minor}.${this._patch}`;
  }

  private _parse(versionString: string): { major: number; minor: number; patch: number } {
    if (!versionString || typeof versionString !== 'string') {
      throw createValidationError('Version must be a non-empty string', 'version', versionString);
    }

    const trimmed = versionString.trim();
    if (!SEMANTIC_VERSION_PATTERN.test(trimmed)) {
      throw createValidationError(
        `Version must be in format X.Y.Z (e.g., 1.0.0), got: "${trimmed}"`,
        'version',
        versionString,
      );
    }

    const parts = trimmed.split('.');
    const [majorStr, minorStr, patchStr] = parts;

    const major = parseInt(majorStr!, 10);
    const minor = parseInt(minorStr!, 10);
    const patch = parseInt(patchStr!, 10);

    // Additional validation for each component
    if (major < 0 || minor < 0 || patch < 0) {
      throw createValidationError(
        'Version components must be non-negative',
        'version',
        versionString,
      );
    }

    return { major, minor, patch };
  }

  // Getters for read-only access
  get major(): number {
    return this._major;
  }

  get minor(): number {
    return this._minor;
  }

  get patch(): number {
    return this._patch;
  }

  toString(): string {
    return this._normalized;
  }

  /**
   * Create a new version with incremented patch number
   */
  incrementPatch(): SemanticVersion {
    return new SemanticVersion(`${this._major}.${this._minor}.${this._patch + 1}`);
  }

  /**
   * Create a new version with incremented minor number (resets patch to 0)
   */
  incrementMinor(): SemanticVersion {
    return new SemanticVersion(`${this._major}.${this._minor + 1}.0`);
  }

  /**
   * Create a new version with incremented major number (resets minor and patch to 0)
   */
  incrementMajor(): SemanticVersion {
    return new SemanticVersion(`${this._major + 1}.0.0`);
  }

  /**
   * Compare with another version
   * Returns: negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other: SemanticVersion): number {
    if (!(other instanceof SemanticVersion)) {
      throw createValidationError(
        'Can only compare with another SemanticVersion instance',
        'other',
        other,
      );
    }

    // Compare major
    const majorDiff = this._major - other._major;
    if (majorDiff !== 0) return majorDiff;

    // Compare minor
    const minorDiff = this._minor - other._minor;
    if (minorDiff !== 0) return minorDiff;

    // Compare patch
    return this._patch - other._patch;
  }

  equals(other: SemanticVersion): boolean {
    return this.compareTo(other) === 0;
  }

  isGreaterThan(other: SemanticVersion): boolean {
    return this.compareTo(other) > 0;
  }

  isLessThan(other: SemanticVersion): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Factory method to create from string
   */
  static parse(versionString: string): SemanticVersion {
    return new SemanticVersion(versionString);
  }
}

// Backward compatibility alias
export { SemanticVersion as Version };
