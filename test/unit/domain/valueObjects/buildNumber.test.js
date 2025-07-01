'use strict';

const BuildNumber = require('../../../../src/domain/valueObjects/buildNumber');
const { ValidationError } = require('../../../../src/shared/errors/customErrors');

describe('BuildNumber', () => {
  describe('constructor', () => {
    test('正の整数でインスタンスを作成できる', () => {
      const buildNumber = new BuildNumber(42);
      expect(buildNumber.getValue()).toBe(42);
    });

    test('0でインスタンスを作成できる', () => {
      const buildNumber = new BuildNumber(0);
      expect(buildNumber.getValue()).toBe(0);
    });

    test('文字列の数値を自動的に変換する', () => {
      const buildNumber = new BuildNumber('123');
      expect(buildNumber.getValue()).toBe(123);
    });

    test('負の数でエラーが発生する', () => {
      expect(() => new BuildNumber(-1)).toThrow(ValidationError);
      expect(() => new BuildNumber(-1)).toThrow('Build number must be a non-negative integer');
    });

    test('小数でエラーが発生する', () => {
      expect(() => new BuildNumber(1.5)).toThrow(ValidationError);
      expect(() => new BuildNumber('1.5')).toThrow(ValidationError);
    });

    test('数値以外の文字列でエラーが発生する', () => {
      expect(() => new BuildNumber('abc')).toThrow(ValidationError);
      expect(() => new BuildNumber('12a')).toThrow(ValidationError);
    });

    test('nullやundefinedでエラーが発生する', () => {
      expect(() => new BuildNumber(null)).toThrow(ValidationError);
      expect(() => new BuildNumber(undefined)).toThrow(ValidationError);
    });
  });

  describe('toString', () => {
    test('文字列として値を返す', () => {
      const buildNumber = new BuildNumber(42);
      expect(buildNumber.toString()).toBe('42');
      expect(typeof buildNumber.toString()).toBe('string');
    });
  });

  describe('increment', () => {
    test('値を1増やした新しいインスタンスを返す', () => {
      const buildNumber = new BuildNumber(42);
      const incremented = buildNumber.increment();

      expect(incremented.getValue()).toBe(43);
      expect(buildNumber.getValue()).toBe(42); // 元のオブジェクトは変更されない
    });

    test('0からもインクリメントできる', () => {
      const buildNumber = new BuildNumber(0);
      const incremented = buildNumber.increment();

      expect(incremented.getValue()).toBe(1);
    });
  });

  describe('compareTo', () => {
    test('同じ値は0を返す', () => {
      const b1 = new BuildNumber(42);
      const b2 = new BuildNumber(42);

      expect(b1.compareTo(b2)).toBe(0);
    });

    test('より大きい値は正の数を返す', () => {
      const b1 = new BuildNumber(50);
      const b2 = new BuildNumber(42);

      expect(b1.compareTo(b2)).toBe(8);
    });

    test('より小さい値は負の数を返す', () => {
      const b1 = new BuildNumber(42);
      const b2 = new BuildNumber(50);

      expect(b1.compareTo(b2)).toBe(-8);
    });

    test('BuildNumber以外のオブジェクトと比較するとエラー', () => {
      const buildNumber = new BuildNumber(42);
      expect(() => buildNumber.compareTo(42)).toThrow(ValidationError);
      expect(() => buildNumber.compareTo('42')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    test('同じ値はtrueを返す', () => {
      const b1 = new BuildNumber(42);
      const b2 = new BuildNumber(42);

      expect(b1.equals(b2)).toBe(true);
    });

    test('異なる値はfalseを返す', () => {
      const b1 = new BuildNumber(42);
      const b2 = new BuildNumber(43);

      expect(b1.equals(b2)).toBe(false);
    });
  });

  describe('isGreaterThan', () => {
    test('より大きい値の場合trueを返す', () => {
      const b1 = new BuildNumber(50);
      const b2 = new BuildNumber(42);

      expect(b1.isGreaterThan(b2)).toBe(true);
    });

    test('同じか小さい値の場合falseを返す', () => {
      const b1 = new BuildNumber(42);
      const b2 = new BuildNumber(42);
      const b3 = new BuildNumber(50);

      expect(b1.isGreaterThan(b2)).toBe(false);
      expect(b1.isGreaterThan(b3)).toBe(false);
    });
  });

  describe('from', () => {
    test('BuildNumberインスタンスをそのまま返す', () => {
      const original = new BuildNumber(42);
      const result = BuildNumber.from(original);

      expect(result).toBe(original);
    });

    test('数値から新しいBuildNumberを作成する', () => {
      const result = BuildNumber.from(42);

      expect(result).toBeInstanceOf(BuildNumber);
      expect(result.getValue()).toBe(42);
    });

    test('文字列から新しいBuildNumberを作成する', () => {
      const result = BuildNumber.from('42');

      expect(result).toBeInstanceOf(BuildNumber);
      expect(result.getValue()).toBe(42);
    });
  });
});
