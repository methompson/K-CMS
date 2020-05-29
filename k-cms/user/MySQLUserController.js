const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool }  = require("mysql2");

const {
  send400Error,
  send401Error,
  send404Error,
  send500Error,
  isObject,
  isNumber,
  isString,
  endOnError,
} = require("../utilities");

const UserController = require("./UserController");

const invalidCredentials = "Invalid Credentials";
const userDataNotProvided = "User Data Not Provided";
const accessDenied = "Access Denied";

class MySQLUserController extends UserController {
  constructor(database, pluginHandler) {
    super(pluginHandler);

    if ( !isObject(database)
      || !('instance' in database)
    ) {
      endOnError("Invalid Database Object Sent");
      return;
    }

    if (!(database.instance instanceof Pool)) {
      endOnError("Database instance is not a MySQL Pool Instance");
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
      this.pluginHandler.runLifecycleHook('loginFailed');
      send401Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }
    const { username, password } = req.body;

    const query = `
      SELECT
        id,
        firstName,
        lastName,
        username,
        email,
        userType,
        password,
        userMeta
      FROM users
      WHERE username = ?
    `;

    const queryParams = [username];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([rows]) => {
        if (rows.length === 0) {
          throw invalidCredentials;
        }

        const userData = {
          ...rows[0],
        };

        const dbPass = userData.password;

        delete userData.password;

        return bcrypt.compare(password, dbPass)
          .then((result) => {
            if (!result) {
              throw invalidCredentials;
            }

            return userData;
          });
      })
      .then((userData) => {
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

        return 200;
      })
      .catch((err) => {
        if (err === invalidCredentials) {
          send401Error(res, invalidCredentials);
        } else {
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
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    if (!('id' in req.params)) {
      const err = "User Id Not Provided";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const query = `
      SELECT
        id,
        firstName,
        lastName,
        username,
        email,
        userType,
        userMeta,
        dateAdded,
        dateUpdated
      FROM users
      WHERE id = ?
    `;
    const queryParams = [req.params.id];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([results]) => {
        if (results.length <= 0) {
          send404Error(res);
          return 404;
        }
        const userData = {
          ...results[0],
        };

        // Let's remove the password field from the output so that we don't allow an attack against their hash
        if ('password' in userData) {
          delete userData.password;
        }

        res.status(200).json(userData);
        return 200;

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
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    const page = isObject(req.params)
      && 'page' in req.params
      && isNumber(Number(req.params.page))
      ? req.params.page
      : 1;

    const query = `
      SELECT
        id,
        firstName,
        lastName,
        username,
        email,
        userType,
        userMeta,
        dateAdded,
        dateUpdated
      FROM users
      ORDER BY id
      LIMIT ?
      OFFSET ?
    `;

    const queryParams = [
      this.pagination,
      this.pagination * (page - 1),
    ];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([results]) => {
        const returnResults = [];
        if (results.length > 0) {
          results.forEach((el) => {
            const user = {
              ...el,
            };
            delete user.password;
            returnResults.push(user);
          });
        }

        res.status(200).json({
          users: returnResults,
        });
        return 200;
      })
      .catch((err) => {
        send500Error(res, "Database Error");
        return err;
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
    const user = req._authData;

    if (!this.checkAllowedUsersForSiteMod(user)) {
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    if (!isObject(req.body) || !('newUser' in req.body)) {
      send400Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }

    const newUser = {
      ...req.body.newUser,
    };

    if ( !('username' in newUser) || !('password' in newUser) || !('email' in newUser)) {
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

    // We've set a unique constraint on the username field, so we can't add a username
    // that already exists.
    return bcrypt.hash(newUser.password, 12)
      .then((password) => {
        let query = "INSERT INTO users (username, email, password, userType, enabled";
        let values = "VALUES (?, ?, ?, ?, ?";
        const queryParams = [newUser.username, newUser.email, password, newUser.userType, newUser.enabled];

        if ('firstName' in newUser) {
          query += ", firstName";
          values += ", ?";
          queryParams.push(newUser.firstName);
        }

        if ('lastName' in newUser) {
          query += ", lastName";
          values += ", ?";
          queryParams.push(newUser.lastName);
        }

        query += ", userMeta";
        values += ", ?";
        if ('userMeta' in newUser) {
          queryParams.push(JSON.stringify(newUser.userMeta));
        } else {
          queryParams.push(JSON.stringify({}));
        }

        const now = new Date();
        query += ", dateAdded, dateUpdated)";
        values += ", ?, ?)";
        queryParams.push(now);
        queryParams.push(now);

        const promisePool = this.db.instance.promise();
        return promisePool.execute(`${query} ${values}`, queryParams)
          .then(([results]) => {
            if (isObject(results)
              && 'affectedRows' in results
              && isNumber(results.affectedRows)
              && "insertId" in results
            ) {

              if (results.affectedRows > 0) {
                res.status(200).json({
                  message: "User Added Successfully",
                  id: results.insertId,
                });
                return 200;
              }

              const error = "User Was Not Added";
              send400Error(res, error);
              return error;
            }

            const error = "Database Error: Improper Results Returned";
            send500Error(res, error);
            return error;
          });
      })
      .catch((err) => {
        if (isObject(err)
          && 'code' in err
          && isString(err.code)
          && err.code === 'ER_DUP_ENTRY'
        ) {
          let msg = "";
          if (err.message.indexOf("users.email") > -1) {
            msg = "Email Already Exists";
          } else {
            msg = "Username Already Exists";
          }

          send400Error(res, msg);
        } else {
          send500Error(res, "Error Adding User");
        }

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
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    if ( !isObject(req.body)
      || !('updatedUser' in req.body)
      || !('id' in req.body.updatedUser)
      || !('data' in req.body.updatedUser)
    ) {
      send400Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }

    const updatedUser = {
      ...req.body.updatedUser.data,
    };

    const { id } = req.body.updatedUser;

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

    return p.then(() => {
      let query = "UPDATE users SET ";
      const queryParams = [];

      if ('username' in updatedUser) {
        query += "username = ?, ";
        queryParams.push(updatedUser.username);
      }

      if ('password' in updatedUser) {
        query += "password = ?, ";
        queryParams.push(updatedUser.password);
      }

      if ('firstName' in updatedUser) {
        query += "firstName = ?, ";
        queryParams.push(updatedUser.firstName);
      }

      if ('lastName' in updatedUser) {
        query += "lastName = ?, ";
        queryParams.push(updatedUser.lastName);
      }

      if ('email' in updatedUser) {
        query += "email = ?, ";
        queryParams.push(updatedUser.email);
      }

      if ('userType' in updatedUser) {
        query += "userType = ?, ";
        queryParams.push(updatedUser.userType);
      }

      if ('enabled' in updatedUser) {
        query += "enabled = ?, ";
        queryParams.push(updatedUser.enabled);
      }

      if ('userMeta' in updatedUser) {
        query += "userMeta = ?, ";
        queryParams.push(JSON.stringify(updatedUser.userMeta));
      }

      const now = new Date();
      query += "dateUpdated = ? WHERE id = ?";
      queryParams.push(now);
      queryParams.push(id);

      const promisePool = this.db.instance.promise();
      return promisePool.execute(query, queryParams);
    })
      .then(([result]) => {
        if (isObject(result)
          && "affectedRows" in result
          && isNumber(result.affectedRows)
        ) {
          if (result.affectedRows > 0) {
            res.status(200).json({
              message: "User Updated Successfully",
            });
            return 200;
          }

          const error = "User Was Not Updated";
          send400Error(res, error);
          return error;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        if (isObject(err)
          && 'code' in err
          && isString(err.code)
          && err.code === 'ER_DUP_ENTRY'
        ) {
          let msg = "";
          if (err.message.indexOf("users.username") > -1) {
            msg = "Username Already Exists";
          } else {
            msg = "Email Already Exists";
          }

          send400Error(res, msg);
        } else {
          send500Error(res, "Error Updating User");
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
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    // Check that the appropriate data was sent to the function
    if ( !isObject(req.body)
      || !('deletedUser' in req.body)
      || !('id' in req.body.deletedUser)
    ) {
      send400Error(res, userDataNotProvided);
      return Promise.resolve(userDataNotProvided);
    }

    // Check that the user isn't trying to delete themself and causing an issue
    if (req.body.deletedUser.id === req._authData.id) {
      const err = "Cannot Delete Yourself";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const query = "DELETE FROM users WHERE id = ? LIMIT 1";
    const queryParams = [req.body.deletedUser.id];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result)
          && "affectedRows" in result
          && isNumber(result.affectedRows)
        ) {
          if (result.affectedRows > 0) {
            res.status(200).json({
              message: "User Deleted Successfully",
            });

            return 200;
          }

          const error = "User Was Not Deleted";
          send400Error(res, error);
          return error;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        send500Error(res, "Error Deleting User");
        return err;
      });
  }
}

module.exports = MySQLUserController;
