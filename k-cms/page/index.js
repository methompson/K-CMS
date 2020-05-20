const MongoPageController = require('./MongoPageController');
const MySQLPageController = require('./MySQLPageController');
const { isObject } = require("../utilities");

/**
 * Detects the database type and makes an appropriate page controller
 * based on the database type
 *
 * @param {Object} authenticator UserController object with authentication methods
 * @param {Object} database Contains database information. type is the database type in string and client is the object that directly controls database commands
 * @returns {Object|null} Returns an Object that extended the PageController class with the appropriate database hooks
 */
const makePageController = (database, pluginHandler) => {
  if ( !isObject(database)
    || !('type' in database)
  ) {
    return null;
  }

  if (database.type === 'mongodb') {
    return new MongoPageController(database, pluginHandler);
  }

  if (database.type === 'mysql') {
    return new MySQLPageController(database, pluginHandler);
  }

  return null;
};

exports.makePageController = makePageController;
