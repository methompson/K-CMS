const isData = require("./isData");

module.exports = {
  ...isData,
  /**
   * Sends an error to the application administration if they configure the CMS
   * incorrectly. If there's a problem with CMS configuration (e.g. incorrect types
   * improper data, etc.), we don't want the application to start up and be a problem
   * so, this function lets the user know WHY their app isn't running.
   *
   * @param {String} error error message to display
   */
  endOnError(error = "") {
    console.log(error);
    process.exit(1);
  },

  /**
   * This function does one thing: Check that a token exists. If it does not exist,
   * the function will send a 401 response to the user. This is a streamlined approach
   * to invalidate users that don't pass an authorization token.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  errorIfTokenDoesNotExist(req, res, next) {
    // check the user's token.
    if (req._authData) {
      next();
      return;
    }

    res.status(401).json({
      error: "Invalid User Token",
    });
  },

  /**
   * Send a 401 error to the user. A lot of problematic requests result in 401 not authorized
   * error messages. This performs the task without having to duplicate the same task
   * over and over again.
   *
   * @param {String} msg The message that is displayed to the user
   * @param {Object} res Express Response Object
   */
  send401Error(msg, res) {
    res.status(401).json({
      error: msg,
    });
  },
};
