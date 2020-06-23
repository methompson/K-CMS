module.exports = {
  isObject(x) {
    return typeof x === typeof {} && !Array.isArray(x) && x !== null;
  },

  isArray(x) {
    return Array.isArray(x);
  },

  isNumber(x) {
    return typeof x === typeof 1 && !Number.isNaN(x);
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

  isUndefined(qUndef) {
    let undef;
    return qUndef === undef;
  },
};
