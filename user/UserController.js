const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ObjectId } = require("mongodb");

const { endOnError, ParamChecker } = require("../utilities");
const PluginHandler = require("../plugin-handler");

class UserController extends ParamChecker {
  // TODO set up database and plugins
  // eslint-disable-next-line no-unused-vars
  constructor(database, pluginHandler) {
    // This does nothing, but it's required nonetheless...
    super();
    this.jwtAlg = "HS256";
    this.passwordLengthMin = 8;
    this.pagination = 30;

    if (pluginHandler instanceof PluginHandler) {
      this.pluginHandler = pluginHandler;
    } else {
      this.pluginHandler = new PluginHandler();
    }

    if (!database) {
      endOnError("Database required for Authenticator");
    }
    this.db = database;

    this.additionalUserRoles = {};

    router.post('/login', (req, res) => {
      this.authenticateUserCredentials(req, res);
    });
    router.get('/login', this.doNothing);

    // We don't pass the methods as variables because we still need to access the variables of
    // the UserController object. If we were to pass the methods as variables, the scope would
    // change and the UserController variables would be inaccessible.
    router.post('/add-user', this.errorIfTokenDoesNotExist, (req, res, next) => { this.addUser(req, res, next); });
    router.post('/edit-user', this.errorIfTokenDoesNotExist, (req, res, next) => { this.editUser(req, res, next); });
    router.post('/delete-user', this.errorIfTokenDoesNotExist, (req, res, next) => { this.deleteUser(req, res, next); });
    router.get('/get-user/:id', this.errorIfTokenDoesNotExist, (req, res, next) => { this.getUser(req, res, next); });
    router.get('/get-all-users/:page*?', this.errorIfTokenDoesNotExist, (req, res, next) => { this.getAllUsers(req, res, next); });

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
      getUserRequestToken: this.getUserRequestToken,
    };
  }

  get userTypes() {
    return {
      superAdmin: {},
      admin: {},
      editor: {},
      subscriber: {},
      ...this.additionalUserRoles,
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
   */
  authenticateUserCredentials(req, res) {
    this.pluginHandler.runLifecycleHook("beforeLoggingIn");

    if ( !('username' in req.body)
      || !('password' in req.body)
    ) {
      this.pluginHandler.runLifecycleHook('loginFailed');
      res.status(401).json({
        error: "User Data Not Provided",
      });
      return;
    }
    const { username, password } = req.body;
    const userData = {};

    const collection = this.db.instance.db("kcms").collection("users");
    collection.findOne({
      username,
    })
      .then((result) => {
        if (!result) {
          throw {
            status: 401,
            error: "Invalid Credentials",
          };
        }

        userData._id = result._id;
        userData.username = result.username;
        userData.userType = result.userType;

        return bcrypt.compare(password, result.password);
      })
      .then((result) => {
        if (!result) {
          throw {
            status: 401,
            error: "Invalid Credentials",
          };
        }

        this.pluginHandler.runLifecycleHook('loginSucceeded');

        const token = jwt.sign(
          {
            ...userData,
          },
          global.jwtSecret,
          {
            expiresIn: '4h',
            algorithm: this.jwtAlg,
          }
        );

        res.status(200).json({
          secret: global.jwtSecret,
          token,
        });
      })
      .catch((err) => {
        this.pluginHandler.runLifecycleHook('loginFailed');
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
  getUserRequestToken(req, res, next) {
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
    jwt.verify(token, global.jwtSecret, { alg: this.jwtAlg }, (err, decoded) => {
      if (err) {
        req._authData = null;
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
   * Checks that the user type is included in the allowed user types for modifying users
   *
   * @param {Object} authToken The jwt token of the user.
   * @return {Boolean} Whether the user is verified
   */
  checkAllowedUsersForSiteMod(authToken) {
    const allowedUserTypes = [
      'superAdmin',
      'admin',
    ];

    // Check that the usertype is in the allowedUserTypes array.
    // Only admin and superAdmin users can add new users.
    if (allowedUserTypes.indexOf(authToken.userType) < 0) {
      return false;
    }

    return true;
  }

  /**
   * Checks that the user type is included in the allowed user types for viewing users
   *
   * @param {Object} authToken The jwt token of the user.
   * @return {Boolean} Whether the user is verified
   */
  checkAllowedUsersForSiteInfo(authToken) {
    const allowedUserTypes = [
      'superAdmin',
      'admin',
      'editor',
    ];

    // Check that the usertype is in the allowedUserTypes array.
    // Only admin and superAdmin users can add new users.
    if (allowedUserTypes.indexOf(authToken.userType) < 0) {
      return false;
    }

    return true;
  }

  /**
   * Send a 401 error to the user. A lot of problematic requests result in 401 not authorized
   * error messages. This performs the task without having to duplicate the same task
   * over and over again.
   *
   * @param {String} msg The message that is displayed to the user
   * @param {Object} res Express Response Object
   */
  send401Error(msg, res) {
    res.status(401).json({
      error: msg,
    });
  }

  getUser(req, res) {
    const user = req._authData;

    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(user)) {
      this.send401Error("User Not Allowed", res);
      return;
    }

    if (!('id' in req.params)) {
      this.send401Error("User Id Not Provided", res);
      return;
    }

    let id;
    try {
      id = ObjectId(req.params.id);
    } catch (err) {
      this.send401Error("Invalid User Id", res);
      return;
    }

    const collection = this.db.instance.db("kcms").collection("users");
    collection.findOne({
      _id: id,
    })
      .then((result) => {
        if (!result) {
          this.send401Error("Invalid User Id", res);
          return;
        }

        const userData = {
          ...result,
        };

        // Let's remove the password field from the output so that we don't allow an attack against their hash
        if ('password' in userData) {
          delete userData.password;
        }

        res.status(200).json(userData);
      })
      .catch((err) => {
        console.log(err);
        this.send401Error("Database Error", res);
      });
  }

  getAllUsers(req, res) {
    const user = req._authData;

    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(user)) {
      this.send401Error("User Not Allowed", res);
      return;
    }

    console.log(req.params.page);
    const page = req.params.page ? req.params.page : 1;
    console.log(page);

    const collection = this.db.instance.db("kcms").collection("users");
    collection.find(
      {},
      {
        projection: { password: 0 },
        skip: ((page - 1) * this.pagination),
        limit: this.pagination,
      }
    )
      .toArray()
      .then((result) => {
        res.status(200).json({
          users: result,
        });
      })
      .catch((err) => {
        console.log(err);
        this.send401Error("Database Error", res);
      });
  }

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
   */
  addUser(req, res) {
    const user = req._authData;

    if (!this.checkAllowedUsersForSiteMod(user)) {
      this.send401Error("User Not Allowed", res);
      return;
    }

    if (!('newUser' in req.body)) {
      this.send401Error("User Data Not Provided", res);
      return;
    }

    const newUser = {
      ...req.body.newUser,
    };

    if ( !('username' in newUser)
      || !('password' in newUser)
    ) {
      this.send401Error("User Data Not Provided", res);
      return;
    }

    if (newUser.password.length < this.passwordLengthMin) {
      this.send401Error("Password length is too short", res);
      return;
    }

    if (!('userType' in newUser)) {
      newUser.userType = 'subscriber';
    }

    if ( !('enabled' in newUser)) {
      newUser.enabled = true;
    }

    const collection = this.db.instance.db("kcms").collection("users");

    // We've set a unique constraint on the username field, so we can't add a username
    // that already exists.
    bcrypt.hash(newUser.password, 12)
      .then((result) => {
        return collection.insertOne(
          {
            ...newUser,
            password: result,
          }
        );
      })
      .then((result) => {
        if (result.upsertedCount > 0) {
          const userId = result.upsertedId._id.toString();
          console.log(userId);
        }
        console.log(result);
        // console.log(result.result.toString());
        res.status(200).json({
          message: "User Added Successfully",
        });
      })
      .catch((err) => {
        // Do Something;
        if (err.errmsg.indexOf("E1100" >= 0)) {
          this.send401Error("Username Already Exists", res);
          return;
        }

        this.send401Error("Error Adding New User", res);

        // console.log("Add User Error");
        // console.log(err);
        // console.log(err.errmsg);
      });
  }

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
   */
  deleteUser(req, res) {
    const user = req._authData;

    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(user)) {
      this.send401Error("User Not Allowed", res);
      return;
    }

    // Check that the appropriate data was sent to the function
    if ( !('deletedUser' in req.body)
      || !('id' in req.body.deletedUser)
    ) {
      this.send401Error("User Data Not Provided", res);
      return;
    }

    // Check that the user isn't trying to delete themself and causing an issue
    if (req.body.deletedUser.id === req._authData._id) {
      this.send401Error("Cannot Delete Yourself", res);
      return;
    }

    const collection = this.db.instance.db("kcms").collection("users");

    collection.deleteOne({
      _id: ObjectId(req.body.deletedUser.id),
    })
      .then((result) => {
        console.log("Deleting User", result);
        res.status(200).json({
          message: "User Deleted Successfully",
        });
      })
      .catch((err) => {
        console.log("Error Deleting User", err);
        this.send401Error("Error Deleting User", res);
      });
  }

  /**
   * This function will edit a user currently in the database. The method expects that
   * getUserRequestToken has already been run and that the user's token has been decoded.
   * It also expects that errorIfTokenDoesNotExist has been run to check that a token
   * exists. We will not have reached this point if a token didn't exist.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   */
  editUser(req, res) {
    const currentUser = req._authData;

    if (!this.checkAllowedUsersForSiteMod(currentUser)) {
      this.send401Error("User Not Allowed", res);
      return;
    }

    if ( !('updatedUser' in req.body)
      || !('id' in req.body.updatedUser)
      || !('data' in req.body.updatedUser)
    ) {
      this.send401Error("User Data Not Provided", res);
      return;
    }

    const updatedUser = {
      ...req.body.updatedUser.data,
    };

    // We either use bcrypt to make a promise or manually make a promise.
    let p;
    if ('password' in updatedUser) {
      if (updatedUser.password.length < 8) {
        this.send401Error("Password length is too short", res);
        return;
      }

      p = bcrypt.hash(updatedUser.password, 12)
        .then((result) => {
          updatedUser.password = result;
        });
    } else {
      p = Promise.resolve();
    }

    const collection = this.db.instance.db("kcms").collection("users");
    p.then(() => {
      console.log(collection);
      return collection.updateOne(
        {
          _id: ObjectId(req.body.updatedUser.id),
        },
        {
          $set: {
            ...updatedUser,
          },
        },
        {
          upsert: true,
        }
      );
    })
      .then((result) => {
        console.log(result);
        console.log("Editing User");
        res.status(200).json({
          message: "User Updated Successfully",
        });
      })
      .catch((err) => {
        console.log(err);
        this.send401Error("Error Updating User", res);
      });
  }
}

module.exports = UserController;
