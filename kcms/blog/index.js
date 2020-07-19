const MongoBlogController = require("./MongoBlogController");
const MySQLBlogController = require("./MySQLBlogController");
const { isObject } = require("../utilities");

/**
 * Detects the database type and makes an appropriate blog controller
 * based on the database type
 *
 * @param {Object} database Contains database information. type is the database type in string and client is the object that directly controls database commands
 * @param {PluginHandler} pluginHandler
 * @returns {Object|null} Returns an Object that extended the PageController class with the appropriate database hooks
 */
const makeBlogController = (database, pluginHandler) => {
  if ( !isObject(database)
    || !('type' in database)
  ) {
    return null;
  }

  if (database.type === 'mongodb') {
    return new MongoBlogController(database, pluginHandler);
  }

  if (database.type === 'mysql') {
    return new MySQLBlogController(database, pluginHandler);
  }

  return null;
};

exports.makeBlogController = makeBlogController;
