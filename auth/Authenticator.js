const router = require('express').Router();

class Authenticator {
  // TODO set up database and plugins
  // eslint-disable-next-line no-unused-vars
  constructor(database, plugins) {
    router.post('/login', this.authenticateUserCredentials);
    router.get('/login', this.doNothing);

    this.authenticationRoutes = router;
  }

  get routes() {
    return this.authenticationRoutes;
  }

  get controller() {
    return {
      doNothing: this.doNothing,
      passThrough: this.passThrough,
      authenticateUserCredentials: this.authenticateUserCredentials,
      authorizeUser: this.authorizeUser,
    };
  }

  // Controllers - Actions taken when routed to a certain page

  /**
   * doNothing is a test controller for testing functionality
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  doNothing(req, res, next) {
    console.log("Did nothing");
    next();
  }

  /**
   * passThrough is a test controller for testing functionality
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  passThrough(req, res, next) {
    console.log("Passed Through");
    next();
  }

  /**
   * This function authenticate's a user's credentials. The user will pass
   * username and password into the function and the app will do what is
   * necessary to determine if the username/password are correct. If the
   * user is authenticated, the credentials will be attached to the request
   * object. If they are not, the function will send an error.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  authenticateUserCredentials(req, res, next) {
    console.log("Authenticating");
    next();
  }

  /**
   * This function will receive a user's token or session, extract the user's
   * authorizations and attach it to a part of the request.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  authorizeUser(req, res, next) {
    console.log("Authorizing User");
    next();
  }
}

module.exports = Authenticator;
