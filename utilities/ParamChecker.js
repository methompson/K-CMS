class ParamChecker {
  get paramTypes() {
    return {
      string: (param) => typeof param === typeof "string",
      number: (param) => typeof param === typeof 1,
      object: (param) => typeof param === typeof {},
      array: (param) => Array.isArray(param),
      boolean: (param) => typeof param === typeof true,
    };
  }
}

module.exports = ParamChecker;
