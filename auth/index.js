const Authenticator = require('./Authenticator');

exports.makeAuthController = function makeAuthController(db, plugins) {
  return new Authenticator(db, plugins);
};
