const http = require("http");

const { endOnError } = require("./endOnError");

/**
 * Sends an HTTP response to the user with a predefined error and message
 * JSON object.
 *
 * @param {String} msg The message that is displayed to the user
 * @param {Number} code The HTTP code to send to the user
 * @param {Object} res Express Response Object
 */
function sendError(res, msg, code) {
  if (!(res instanceof http.ServerResponse)) {
    endOnError("Invalid Response Object", 1);
    return;
  }

  res.status(code).json({
    error: msg,
  });
}

module.exports = {
  sendError,
};
