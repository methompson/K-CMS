const httpErrors = require("./httpErrors");
const { isObject } = require("./isData");

/**
 * This function does one thing: Check that a token exists. If it does not exist,
 * the function will send a 401 response to the user. This is a streamlined approach
 * to invalidate users that don't pass an authorization token.
 *
 * @param {Object} req Express Request Object
 * @param {Object} res Express Response Object
 * @param {Function} next Express Next Function
 */
function errorIfTokenDoesNotExist(req, res, next) {
  // check the user's token.
  if ( isObject(req)
    && isObject(req._authData)
  ) {
    next();
    return;
  }

  httpErrors.send401Error(res, "Invalid User Token");
}

module.exports = {
  errorIfTokenDoesNotExist,
};
