const UserController = require('./UserController');

exports.makeUserController = function makeUserController(db, plugins) {
  return new UserController(db, plugins);
};
