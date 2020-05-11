const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId, MongoClient } = require("mongodb");

const {
  send400Error,
  send401Error,
  send500Error,
  isObject,
  isNumber,
  endOnError,
} = require("../utilities");

const UserController = require("./UserController");

const invalidCredentials = "Invalid Credentials";
const invalidUserId = "Invalid User Id";

class MongoUserController extends UserController {
  constructor(database, pluginHandler) {
    super(pluginHandler);

    if ( !isObject(database)
      || !('instance' in database)
    ) {
      endOnError("Invalid Database Object Sent");
      return;
    }

    if (!(database.instance instanceof MongoClient)) {
      endOnError("Database instance is not a MongoDB Client");
      return;
    }

    this.db = database;
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
   * @param {http.ServerResponse} res Express Response Object
   * @param {Function} next Express Next Function
   * @returns {Promise} For testing purposes
   */
  authenticateUserCredentials(req, res) {
    this.pluginHandler.runLifecycleHook("beforeLoggingIn");

    if ( !isObject(req.body)
      || !('username' in req.body)
      || !('password' in req.body)
    ) {
      const err = "User Data Not Provided";
      this.pluginHandler.runLifecycleHook('loginFailed');
      send401Error(res, err);
      return Promise.resolve(err);
    }
    const { username, password } = req.body;
    const userData = {};

    const collection = this.db.instance.db("kcms").collection("users");
    return collection.findOne({
      username,
    })
      .then((result) => {
        if (!result) {
          send401Error(res, invalidCredentials);
          throw invalidCredentials;
        }

        userData._id = result._id;
        userData.username = result.username;
        userData.userType = result.userType;

        return bcrypt.compare(password, result.password);
      })
      .then((result) => {
        if (!result) {
          send401Error(res, invalidCredentials);
          throw invalidCredentials;
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
          token,
        });
      })
      .catch((err) => {
        this.pluginHandler.runLifecycleHook('loginFailed');
        if (err !== invalidCredentials) {
          send500Error(res, err);
        }

        return err;
      });
  }

  /**
   * Gets user data about a single user
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  getUser(req, res) {
    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteInfo(req._authData)) {
      send401Error(res, "");
      return Promise.resolve("Invalid User");
    }

    if (!('id' in req.params)) {
      const err = "User Id Not Provided";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    let id;
    try {
      id = ObjectId(req.params.id);
    } catch (err) {
      send400Error(res, invalidUserId);
      return Promise.resolve(invalidUserId);
    }

    const collection = this.db.instance.db("kcms").collection("users");
    return collection.findOne({
      _id: id,
    })
      .then((result) => {
        if (!result) {
          send400Error(res, invalidUserId);
          return invalidUserId;
        }

        const userData = {
          ...result,
        };

        // Let's remove the password field from the output so that we don't allow an attack against their hash
        if ('password' in userData) {
          delete userData.password;
        }

        res.status(200).json(userData);

        return null;
      })
      .catch((err) => {
        send500Error(res, "Database Error");

        return err;
      });
  }

  /**
   * Gets an array of all users. The function requires that a user have sufficient
   * permissions to view this list of users.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} For testing purposes
   */
  getAllUsers(req, res) {
    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      send401Error(res, "");
      return Promise.resolve("Permission Denied");
    }

    const page = isObject(req.params) && 'page' in req.params && isNumber(req.params.page) ? req.params.page : 1;

    const collection = this.db.instance.db("kcms").collection("users");
    return collection.find(
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
      // .catch((err) => {
      .catch(() => {
        send500Error(res, "Database Error");
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
   * @returns {Promise} For testing purposes
   */
  addUser(req, res) {
    const userDataNotProvided = "User Data Not Provided";
    const user = req._authData;

    if (!this.checkAllowedUsersForSiteMod(user)) {
      send401Error(res, "Access Denied");
      return Promise.resolve("Access Denied");
    }

    if (!isObject(req.body) || !('newUser' in req.body)) {
      send400Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }

    const newUser = {
      ...req.body.newUser,
    };

    if ( !('username' in newUser) || !('password' in newUser) ) {
      send400Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }

    if (newUser.password.length < this.passwordLengthMin) {
      const err = "Password length is too short";
      send400Error(res, err);
      return Promise.resolve(err);
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
    return bcrypt.hash(newUser.password, 12)
      .then((result) => {
        return collection.insertOne(
          {
            ...newUser,
            password: result,
          }
        );
      })
      .then((result) => {
        let userId;
        if (result.insertedCount > 0) {
          userId = result.insertedId.toString();
        }

        res.status(200).json({
          message: "User Added Successfully",
          userId,
        });

        return null;
      })
      .catch((err) => {
        // Do Something;
        if ( isObject(err)
          && 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Username Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }

        return err;
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
   * @returns {Promise} For testing purposes
   */
  deleteUser(req, res) {
    const user = req._authData;

    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(user)) {
      send401Error(res, "Access Denied");
      return Promise.resolve("Access Denied");
    }

    // Check that the appropriate data was sent to the function
    if ( !isObject(req.body)
      || !('deletedUser' in req.body)
      || !('id' in req.body.deletedUser)
    ) {
      const err = "User Data Not Provided";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    // Check that the user isn't trying to delete themself and causing an issue
    if (req.body.deletedUser.id === req._authData._id) {
      const err = "Cannot Delete Yourself";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    let id;
    try {
      id = ObjectId(req.body.deletedUser.id);
    } catch (err) {
      console.log(err);
      send400Error(res, invalidUserId);
      return Promise.resolve(invalidUserId);
    }

    const collection = this.db.instance.db("kcms").collection("users");

    return collection.deleteOne({
      _id: id,
    })
      // .then((result) => {
      .then(() => {
        res.status(200).json({
          message: "User Deleted Successfully",
        });
      })
      .catch((err) => {
        send500Error(res, "Error Deleting User");
        return err;
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
   * @returns {Promise} For testing purposes
   */
  editUser(req, res) {
    const currentUser = req._authData;

    if (!this.checkAllowedUsersForSiteMod(currentUser)) {
      send401Error(res, "Access Denied");
      return Promise.resolve("Access Denied");
    }

    if ( !isObject(req.body)
      || !('updatedUser' in req.body)
      || !('id' in req.body.updatedUser)
      || !('data' in req.body.updatedUser)
    ) {
      const err = "User Data Not Provided";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const updatedUser = {
      ...req.body.updatedUser.data,
    };

    let id;
    try {
      id = ObjectId(req.body.updatedUser.id);
    } catch (err) {
      send400Error(res, invalidUserId);
      return Promise.resolve(invalidUserId);
    }

    // We either use bcrypt to make a promise or manually make a promise.
    let p;
    if ('password' in updatedUser) {

      if (updatedUser.password.length < this.passwordLengthMin) {
        const err = "Password length is too short";
        send400Error(res, err);
        return Promise.resolve(err);
      }

      p = bcrypt.hash(updatedUser.password, 12)
        .then((result) => {
          updatedUser.password = result;
        });
    } else {
      p = Promise.resolve();
    }

    const collection = this.db.instance.db("kcms").collection("users");
    return p.then(() => {
      return collection.updateOne(
        { _id: id },
        { $set: { ...updatedUser } },
        { upsert: true }
      );
    })
      // .then((result) => {
      .then(() => {
        res.status(200).json({
          message: "User Updated Successfully",
        });
      })
      .catch((err) => {
        if ( isObject(err)
          && 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Username Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }
        return err;
      });
  }
}

module.exports = MongoUserController;
