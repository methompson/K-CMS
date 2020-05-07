const {
  isObject,
  isArray,
  isNumber,
  isString,
  isBoolean,
  isFunction,
} = require("../../../../kcms/utilities/isData");

class MyClass {
  constructor() {
    this.val = 123;
  }
}

const cl = new MyClass();

describe("isData", () => {
  describe("isObject", () => {
    test("isObject will return true for objects and false for non-objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject(9)).toBe(false);
      expect(isObject("9")).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject( () => {} )).toBe(false);
      expect(isObject(cl)).toBe(true);
    });
  });

  describe("isArray", () => {
    test("isArray will return true for objects and false for non-objects", () => {
      expect(isArray({})).toBe(false);
      expect(isArray([])).toBe(true);
      expect(isArray(9)).toBe(false);
      expect(isArray("9")).toBe(false);
      expect(isArray(true)).toBe(false);
      expect(isArray( () => {} )).toBe(false);
      expect(isArray(cl)).toBe(false);
    });
  });

  describe("isNumber", () => {
    test("isNumber will return true for objects and false for non-objects", () => {
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
      expect(isNumber(9)).toBe(true);
      expect(isNumber("9")).toBe(false);
      expect(isNumber(true)).toBe(false);
      expect(isNumber( () => {} )).toBe(false);
      expect(isNumber(cl)).toBe(false);
    });
  });

  describe("isString", () => {
    test("isString will return true for objects and false for non-objects", () => {
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
      expect(isString(9)).toBe(false);
      expect(isString("9")).toBe(true);
      expect(isString("")).toBe(true);
      expect(isString(true)).toBe(false);
      expect(isString( () => {} )).toBe(false);
      expect(isString(cl)).toBe(false);
    });
  });

  describe("isBoolean", () => {
    test("isBoolean will return true for objects and false for non-objects", () => {
      expect(isBoolean({})).toBe(false);
      expect(isBoolean([])).toBe(false);
      expect(isBoolean(9)).toBe(false);
      expect(isBoolean(0)).toBe(false);
      expect(isBoolean("9")).toBe(false);
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean( () => {} )).toBe(false);
      expect(isBoolean(cl)).toBe(false);
    });
  });

  describe("isFunction", () => {
    test("isFunction will return true for objects and false for non-objects", () => {
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction(9)).toBe(false);
      expect(isFunction("9")).toBe(false);
      expect(isFunction(true)).toBe(false);
      expect(isFunction( () => {} )).toBe(true);
      expect(isFunction(cl)).toBe(false);
    });
  });
});
