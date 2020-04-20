const MongoPageController = require('./MongoPageController');

/**
 * Detects the database type and makes an appropriate page controller
 * based on the database type
 *
 * @param {Object} authenticator UserController object with authentication methods
 * @param {Object} database Contains database information. type is the database type in string and client is the object that directly controls database commands
 * @return {Object} Returns an Object that extended the PageController class with the appropriate database hooks
 */
function makePageController(authenticator, database, pluginHandler) {
  if (database.type === 'mongodb') {
    return new MongoPageController(authenticator, database, pluginHandler);
  }

  return false;
}

exports.makePageController = makePageController;
