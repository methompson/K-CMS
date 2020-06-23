/* eslint-disable no-unused-vars */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

const {
  errorIfTokenDoesNotExist,
  send401Error,
  isObject,
} = require("../utilities");

const PluginHandler = require("../plugin-handler");

class UserController {
  // TODO set up database and plugins
  // eslint-disable-next-line no-unused-vars
  constructor(pluginHandler) {
    this.jwtAlg = "HS256";
    this.passwordLengthMin = 8;
    this.pagination = 30;
    this.userEditors = [
      'superAdmin',
      'admin',
    ];

    this.userViewers = [
      'superAdmin',
      'admin',
      'editor',
    ];

    if (pluginHandler instanceof PluginHandler) {
      this.pluginHandler = pluginHandler;
    } else {
      this.pluginHandler = new PluginHandler();
    }

    this.additionalUserRoles = {};

    this.router = router;

    // We don't pass the methods as variables because we still need to access the variables of
    // the UserController object. If we were to pass the methods as variables, the scope would
    // change and the UserController variables would be inaccessible.
    this.router.post('/login', (req, res) => { this.authenticateUserCredentials(req, res); });
    this.router.post('/add-user', errorIfTokenDoesNotExist, (req, res, next) => { this.addUser(req, res, next); });
    this.router.post('/edit-user', errorIfTokenDoesNotExist, (req, res, next) => { this.editUser(req, res, next); });
    this.router.post('/delete-user', errorIfTokenDoesNotExist, (req, res, next) => { this.deleteUser(req, res, next); });

    this.router.get('/get-user/:id', errorIfTokenDoesNotExist, (req, res, next) => { this.getUser(req, res, next); });
    this.router.get('/all-users/:page*?', errorIfTokenDoesNotExist, (req, res, next) => { this.getAllUsers(req, res, next); });
    this.router.get('/get-user-types', errorIfTokenDoesNotExist, (req, res, next) => { this.getUserTypes(req, res, next); });
  }

  get routes() {
    return this.router;
  }

  get userTypes() {
    return {
      superAdmin: {
        permissions: ['view', 'edit'],
      },
      admin: {
        permissions: ['view', 'edit'],
      },
      editor: {
        permissions: ['view'],
      },
      subscriber: {
        permissions: [],
      },
      ...this.additionalUserRoles,
    };
  }

  // Controllers - Actions taken when routed to a certain page

  /**
   * Sends the list of user types to the user as an array. This is only available for users
   * who are allowed to modify users.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {String|Number} Returns a string error or 200 to indicate success
   */
  getUserTypes(req, res) {
    const user = req._authData;

    if (!this.checkAllowedUsersForSiteMod(user)) {
      const accessDenied = "Access Denied";
      send401Error(res, accessDenied);
      return accessDenied;
    }

    const names = Object.keys(this.userTypes);

    res.status(200).json(names);
    return 200;
  }

  /**
   * This function will extract a user's token from the request header. The function
   * will check the validity of the token and place the payload into the request.
   * If no token is provided OR the token is no longer valid, this funciton will
   * insert a null in place of the payload. The payload will be attached to
   * req._authData.
   *
   * This function is designed to be run any time a page is loaded. This allows
   * all other functions to easily check for user information.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   * @returns {Promise} For testing purposes
   */
  getUserRequestToken(req, res, next) {
    // Check the headers for an authorization token
    if ( !('authorization' in req.headers) ) {
      req._authData = null;
      next();
      return Promise.resolve();
    }

    // Split the authorization header
    const split = req.headers.authorization.split(' ');

    // Check the split authorization header
    if ( split.length < 2
      || split.length > 2
      || split[0] !== 'Bearer'
    ) {
      req._authData = null;
      next();
      return Promise.resolve();
    }

    const token = split[1];
    return new Promise((resolve, reject) => {
      jwt.verify(token, global.jwtSecret, { alg: this.jwtAlg }, (err, decoded) => {
        if (err) {
          req._authData = null;
        } else {
          req._authData = decoded;
        }

        next();
        resolve();
      });
    });
  }

  /**
   * Checks that the user type is included in the allowed user types for modifying users
   *
   * @param {Object} authToken The jwt token of the user.
   * @returns {Boolean} Whether the user is verified
   */
  checkAllowedUsersForSiteMod(authToken) {
    if ( isObject(authToken)
      && 'userType' in authToken
      && authToken.userType in this.userTypes
    ) {
      return this.userTypes[authToken.userType].permissions.includes('edit');
    }

    return false;
  }

  /**
   * Checks that the user type is included in the allowed user types for viewing users
   *
   * @param {Object} authToken The jwt token of the user.
   * @returns {Boolean} Whether the user is verified
   */
  checkAllowedUsersForSiteInfo(authToken) {
    if ( isObject(authToken)
      && 'userType' in authToken
      && authToken.userType in this.userTypes
    ) {
      return this.userTypes[authToken.userType].permissions.includes('view');
    }

    return false;
  }

  /**
   * Interfaces
   */

  /**
   * This function authenticates a user's credentials. The user sends a JSON string
   * with user and password in the body of a POST request to this route. This function
   * extracts the JSON string from the body and checks the user credentials to determine
   * their validity.
   *
   * Upon success, this method will send a response to the user with a JWT contained
   * in the body. Upon failure, an error will be sent back to the user.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   * @returns {Promise} For testing purposes
   */
  authenticateUserCredentials(req, res) {}

  /**
   * Gets user data about a single user
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  getUser(req, res) {}

  /**
   * Gets an array of all users. The function requires that a user have sufficient
   * permissions to view this list of users.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  getAllUsers(req, res) {}

  /**
   * This function will add a user to the current database. The method expects that
   * getUserRequestToken has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   * exists. We will not have reached this point if a token didn't exist.
   *
   * Data required to add a user:
   * username (must be Unique)
   * userType
   * password
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  addUser(req, res) {}

  /**
   * This function will delete a user from the current database. The method expects that
   * getUserRequestToken has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   * exists. We will not have reached this point if a token didn't exist.
   *
   * This method relies on an id being sent.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  deleteUser(req, res) {}

  /**
   * This function will edit a user currently in the database. The method expects that
   * getUserRequestToken has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   * exists. We will not have reached this point if a token didn't exist.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  editUser(req, res) {}
}

module.exports = UserController;
