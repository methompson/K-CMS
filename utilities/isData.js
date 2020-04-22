module.exports = {
  isObject(x) {
    return typeof x === typeof {};
  },

  isArray(x) {
    return Array.isArray(x);
  },

  isNumber(x) {
    return typeof x === typeof 1;
  },

  isString(x) {
    return typeof x === typeof "string";
  },

  isBoolean(x) {
    return typeof x === typeof true;
  },

  isFunction(x) {
    const func = () => {};
    return typeof x === typeof func;
  },
};
