const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { endOnError, ParamChecker } = require("../utilities");

class UserController extends ParamChecker {
  // TODO set up database and plugins
  // eslint-disable-next-line no-unused-vars
  constructor(database, plugins = []) {
    console.log("UserController, plugins:", plugins);
    // Does nothing, but required nonetheless...
    super();

    if (!database) {
      endOnError("Database required for Authenticator");
    }
    this.db = database;

    if (plugins && typeof plugins === typeof {}) {
      this.plugins = plugins;
    } else {
      this.plugins = [];
    }

    router.post('/login', (req, res) => {
      this.authenticateUserCredentials(req, res);
    });
    router.get('/login', this.doNothing);

    router.post('/add-user', this.errorIfTokenDoesNotExist, this.addUser);
    router.post('/edit-user', this.errorIfTokenDoesNotExist, this.editUser);
    router.post('/delete-user', this.errorIfTokenDoesNotExist, this.deleteUser);

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
   * This function authenticate's a user's credentials. The user sends a JSON string
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
   */
  authenticateUserCredentials(req, res) {
    this.pluginRunner("beforeLoggingIn");

    if ( !('user' in req.body)
      || !('password' in req.body)
    ) {
      this.pluginRunner('loginFailed');
      res.status(401).json({
        error: "User Data Not Provided",
      });
      return;
    }
    const { user, password } = req.body;
    const userData = {};

    const collection = this.db.instance.db("kcms").collection("users");
    collection.findOne({
      user,
    })
      .then((result) => {
        if (!result) {
          throw {
            status: 401,
            error: "Invalid Credentials",
          };
        }

        userData._id = result._id;
        userData.user = result.user;

        return bcrypt.compare(password, result.password);
      })
      .then((result) => {
        if (!result) {
          throw {
            status: 401,
            error: "Invalid Credentials",
          };
        }

        this.pluginRunner('loginSucceeded');

        const token = jwt.sign(
          {
            ...userData,
          },
          global.jwtSecret,
          {
            expiresIn: '4h',
          }
        );

        res.status(200).json({
          secret: global.jwtSecret,
          token,
        });
      })
      .catch((err) => {
        this.pluginRunner('loginFailed');
        if ( err.status && err.error ) {
          res.status(err.status).json({
            error: err.error,
          });
        } else {
          res.status(500).json({
            error: "Server Error",
          });
        }
      });
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
   */
  authorizeUser(req, res, next) {
    console.log("Authorizing User");

    // Check the headers for an authorization token
    if ( !('authorization' in req.headers) ) {
      req._authData = null;
      next();
      return;
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
      return;
    }

    const token = split[1];
    jwt.verify(token, global.jwtSecret, (err, decoded) => {
      if (err) {
        req._authData = null;
        // console.log(err);
      } else {
        req._authData = decoded;
      }

      next();
    });
  }

  /**
   * This function does one thing: Check that a token exists. If it does not exist,
   * the function will send a 401 response to the user. This is a streamlined approach
   * to invalidate users that don't pass an authorization token.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  errorIfTokenDoesNotExist(req, res, next) {
    // check the user's token.
    if (req._authData) {
      next();
      return;
    }

    res.status(401).json({
      error: "Invalid User Token",
    });
  }

  /**
   * This function will add a user to the current database. The method expects that
   * authorizeUser has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   * exists.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  addUser(req, res, next) {
    console.log("Adding User");
    next();
  }

  /**
   * This function will delete a user from the current database. The method expects that
   * authorizeUser has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  deleteUser(req, res, next) {
    console.log("Deleting User");
    next();
  }

  /**
   * This function will edit a user currently in the database. The method expects that
   * authorizeUser has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @param {Function} next Express Next Function
   */
  editUser(req, res, next) {
    console.log("Editing User");
    next();
  }

  /**
   * This function takes the name of the current lifecycle hook. It looks in the plugins
   * object for that lifeCycle hook and runs each function associated with that lifecycle.
   * There is no order of operations, so lifecycle hooks should rely on being run in a
   * specific order.
   *
   * @param {String} lifeCycle lifecycle hook name
   */
  pluginRunner(lifeCycle) {
    if (lifeCycle in this.plugins) {
      for (let x = 0, len = this.plugins[lifeCycle].length; x < len; ++x) {
        this.plugins[lifeCycle][x]();
      }
    }
  }
}

module.exports = UserController;
