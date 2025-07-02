import { describe, expect, test } from 'vitest';
import { Version } from '../../../../src/domain/valueObjects/version.js';
import { ValidationError } from '../../../../src/shared/errors/customErrors.js';

describe('Version', () => {
  describe('constructor', () => {
    test('有効なバージョン文字列でインスタンスを作成できる', () => {
      const version = new Version('1.2.3');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.toString()).toBe('1.2.3');
    });

    test('空文字列でエラーが発生する', () => {
      expect(() => new Version('')).toThrow(ValidationError);
      expect(() => new Version('')).toThrow('Version must be a non-empty string');
    });

    test('無効な形式でエラーが発生する', () => {
      const invalidVersions = ['1.2', '1.2.3.4', 'v1.2.3', '1.2.a', 'abc'];

      invalidVersions.forEach((invalid) => {
        expect(() => new Version(invalid)).toThrow(ValidationError);
        expect(() => new Version(invalid)).toThrow('Version must be in format X.Y.Z');
      });
    });

    test('nullやundefinedでエラーが発生する', () => {
      expect(() => new Version(null as any)).toThrow(ValidationError);
      expect(() => new Version(undefined as any)).toThrow(ValidationError);
    });
  });

  describe('incrementPatch', () => {
    test('パッチバージョンを正しくインクリメントする', () => {
      const version = new Version('1.2.3');
      const newVersion = version.incrementPatch();

      expect(newVersion.toString()).toBe('1.2.4');
      expect(version.toString()).toBe('1.2.3'); // 元のオブジェクトは変更されない
    });

    test('パッチが9から10になる場合も正しく動作する', () => {
      const version = new Version('1.2.9');
      const newVersion = version.incrementPatch();

      expect(newVersion.toString()).toBe('1.2.10');
    });
  });

  describe('incrementMinor', () => {
    test('マイナーバージョンを正しくインクリメントし、パッチを0にリセットする', () => {
      const version = new Version('1.2.3');
      const newVersion = version.incrementMinor();

      expect(newVersion.toString()).toBe('1.3.0');
    });
  });

  describe('incrementMajor', () => {
    test('メジャーバージョンを正しくインクリメントし、マイナーとパッチを0にリセットする', () => {
      const version = new Version('1.2.3');
      const newVersion = version.incrementMajor();

      expect(newVersion.toString()).toBe('2.0.0');
    });
  });

  describe('compareTo', () => {
    test('同じバージョンは0を返す', () => {
      const v1 = new Version('1.2.3');
      const v2 = new Version('1.2.3');

      expect(v1.compareTo(v2)).toBe(0);
    });

    test('より大きいバージョンは1を返す', () => {
      expect(new Version('2.0.0').compareTo(new Version('1.9.9'))).toBe(1);
      expect(new Version('1.3.0').compareTo(new Version('1.2.9'))).toBe(1);
      expect(new Version('1.2.4').compareTo(new Version('1.2.3'))).toBe(1);
    });

    test('より小さいバージョンは-1を返す', () => {
      expect(new Version('1.9.9').compareTo(new Version('2.0.0'))).toBe(-1);
      expect(new Version('1.2.9').compareTo(new Version('1.3.0'))).toBe(-1);
      expect(new Version('1.2.3').compareTo(new Version('1.2.4'))).toBe(-1);
    });

    test('Version以外のオブジェクトと比較するとエラー', () => {
      const version = new Version('1.2.3');
      expect(() => version.compareTo('1.2.3' as any)).toThrow(ValidationError);
      expect(() => version.compareTo(null as any)).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    test('同じバージョンはtrueを返す', () => {
      const v1 = new Version('1.2.3');
      const v2 = new Version('1.2.3');

      expect(v1.equals(v2)).toBe(true);
    });

    test('異なるバージョンはfalseを返す', () => {
      const v1 = new Version('1.2.3');
      const v2 = new Version('1.2.4');

      expect(v1.equals(v2)).toBe(false);
    });
  });
});
