const UserController = require('./UserController');

exports.makeUserController = function makeUserController(db, pluginHandler) {
  return new UserController(db, pluginHandler);
};
