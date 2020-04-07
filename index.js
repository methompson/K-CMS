const uuidv4 = require("uuid/v4");

const CMS = require('./cms');

function createNewApp(options = {}) {
  // We need a server secret attached to the global object.
  // The order of operations is to let the user define the secret in the options
  // object passed to this method, set an environment variable or let the
  // package create a random secret on restart.
  if ('jwtSecret' in options) {
    global.jwtSecret = options.jwtSecret;
  } else if (process.env.JWT_SECRET) {
    global.jwtSecret = process.env.JWT_SECRET;
  } else {
    global.jwtSecret = uuidv4();
  }

  const cms = new CMS(options);

  return cms;
}

module.exports = createNewApp;
