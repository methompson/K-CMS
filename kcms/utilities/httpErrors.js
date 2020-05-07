const { sendError } = require("./sendError");

/**
 * Send a 400 error to the user. A lot of problematic requests result in 400 bad request
 * error messages. This performs the task without having to duplicate the same task
 * over and over again.
 *
 * @param {String} msg The message that is displayed to the user
 * @param {Object} res Express Response Object
 */
function send400Error(res, msg) {
  sendError(res, msg, 400);
}

/**
 * Send a 401 error to the user. A lot of problematic requests result in 401 not authorized
 * error messages. This performs the task without having to duplicate the same task
 * over and over again.
 *
 * @param {String} msg The message that is displayed to the user
 * @param {Object} res Express Response Object
 */
function send401Error(res, msg) {
  sendError(res, msg, 401);
}

/**
 * Send a 500 error to the user. A lot of problematic requests result in 500 server error
 * error messages. This performs the task without having to duplicate the same task
 * over and over again.
 *
 * @param {String} msg The message that is displayed to the user
 * @param {Object} res Express Response Object
 */
function send500Error(res, msg) {
  sendError(res, msg, 500);
}

module.exports = {
  send400Error,
  send401Error,
  send500Error,
};
