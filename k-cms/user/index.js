const MongoUserController = require('./MongoUserController');
const { isObject } = require("../utilities");

/**
 * Makes a user controller based on the input from the user. Right now,
 * MongoDb is the only database being used. Eventually, a MySQL db will
 * be implemented
 *
 * @param {Object} db Object containing information about the database being used
 * @param {PluginHandler} pluginHandler PluginHandler object to be used for the main app
 */
const makeUserController = (db, pluginHandler) => {
  // return new UserController(db, pluginHandler);
  if (isObject(db) && db.type === 'mongodb') {
    return new MongoUserController(db, pluginHandler);
  }

  return null;
};

exports.makeUserController = makeUserController;
