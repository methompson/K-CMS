const { endOnError } = require("./endOnError");
const { sendError } = require("./sendError");
const httpErrors = require("./httpErrors");
const isData = require("./isData");
const { errorIfTokenDoesNotExist } = require("./errorIfTokenDoesNotExist");

module.exports = {
  ...isData,
  ...httpErrors,
  endOnError,
  sendError,
  errorIfTokenDoesNotExist,
};
