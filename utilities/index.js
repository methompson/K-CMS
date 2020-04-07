const ParamChecker = require("./ParamChecker");

exports.ParamChecker = ParamChecker;

exports.endOnError = (error = "") => {
  console.log(error);
  process.exit(1);
};
