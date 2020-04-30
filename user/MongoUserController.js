const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require("mongodb");

const {
  send400Error,
  send401Error,
  send500Error,
} = require("../utilities");

const UserController = require("./UserController");

const invalidCredentials = "Invalid Credentials";

class MongoUserController extends UserController {
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
  authenticateUserCredentials(req, res) {
    this.pluginHandler.runLifecycleHook("beforeLoggingIn");

    if ( !('username' in req.body)
      || !('password' in req.body)
    ) {
      const err = "User Data Not Provided";
      this.pluginHandler.runLifecycleHook('loginFailed');
      send401Error(res, err);
      return Promise.reject(err);
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
          secret: global.jwtSecret,
          token,
        });
      })
      .catch((err) => {
        this.pluginHandler.runLifecycleHook('loginFailed');
        if (err !== invalidCredentials) {
          send500Error(res, err);
        }

        throw err;
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
    const invalidUserId = "Invalid User Id";
    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      send401Error(res, "");
      return Promise.reject("Invalid User");
    }

    if (!('id' in req.params)) {
      const err = "User Id Not Provided";
      send400Error(res, err);
      return Promise.reject(err);
    }

    let id;
    try {
      id = ObjectId(req.params.id);
    } catch (err) {
      send400Error(res, invalidUserId);
      return Promise.reject(invalidUserId);
    }

    const collection = this.db.instance.db("kcms").collection("users");
    return collection.findOne({
      _id: id,
    })
      .then((result) => {
        if (!result) {
          send400Error(res, invalidUserId);
          throw invalidUserId;
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
        if (err !== invalidUserId) {
          send500Error(res, "Database Error");
        }

        throw err;
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
      return Promise.reject("Permission Denied");
    }

    console.log(req.params.page);
    const page = req.params.page ? req.params.page : 1;
    console.log(page);

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
      .catch((err) => {
        console.log(err);
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
      send401Error(res, "");
      return Promise.reject("Access Denied");
    }

    if (!('newUser' in req.body)) {
      send400Error(res, userDataNotProvided);
      return Promise.reject(userDataNotProvided);
    }

    const newUser = {
      ...req.body.newUser,
    };

    if ( !('username' in newUser) || !('password' in newUser) ) {
      send400Error(res, userDataNotProvided);
      return Promise.reject(userDataNotProvided);
    }

    if (newUser.password.length < this.passwordLengthMin) {
      const err = "Password length is too short";
      send400Error(res, err);
      return Promise.reject(err);
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
        if ( 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Username Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }

        throw err;

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
   * @returns {Promise} For testing purposes
   */
  deleteUser(req, res) {
    const user = req._authData;

    // Check that the user is allowed to perform this work
    if (!this.checkAllowedUsersForSiteMod(user)) {
      send401Error(res, "");
      return Promise.reject("Permission Denied");
    }

    // Check that the appropriate data was sent to the function
    if ( !('deletedUser' in req.body)
      || !('id' in req.body.deletedUser)
    ) {
      const err = "User Data Not Provided";
      send400Error(res, err);
      return Promise.reject(err);
    }

    // Check that the user isn't trying to delete themself and causing an issue
    if (req.body.deletedUser.id === req._authData._id) {
      const err = "Cannot Delete Yourself";
      send400Error(res, err);
      return Promise.reject(err);
    }

    const collection = this.db.instance.db("kcms").collection("users");

    return collection.deleteOne({
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
        send500Error(res, "Error Deleting User");
        throw err;
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
      send401Error(res, "");
      return Promise.reject("Access Denied");
    }

    if ( !('updatedUser' in req.body)
      || !('id' in req.body.updatedUser)
      || !('data' in req.body.updatedUser)
    ) {
      const err = "User Data Not Provided";
      send400Error(res, err);
      return Promise.reject(err);
    }

    const updatedUser = {
      ...req.body.updatedUser.data,
    };

    // We either use bcrypt to make a promise or manually make a promise.
    let p;
    if ('password' in updatedUser) {
      if (updatedUser.password.length < 8) {
        const err = "Password length is too short";
        send400Error(res, err);
        return Promise.reject(err);
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
        if ( 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Username Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }
        throw err;
      });
  }
}

module.exports = MongoUserController;
