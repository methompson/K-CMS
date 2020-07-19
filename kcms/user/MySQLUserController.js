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

    return this.getUserById(req.params.id)
      .then((result) => {
        if (!result) {
          send404Error(res);
          return 404;
        }

        // This is just to satisfy the linter
        const userData = {
          ...result,
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
   * Performs a seaerch for a user based on their id.
   *
   * @param {String} id String representation of the user's id
   * @returns {Promise} resolves to an object of user data
   */
  getUserById(id) {
    const query = `
      SELECT
        id,
        firstName,
        lastName,
        username,
        password,
        email,
        enabled,
        userType,
        userMeta,
        dateAdded,
        dateUpdated
      FROM users
      WHERE id = ?
    `;
    const queryParams = [id];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([results]) => {
        let userData = null;
        if (results.length > 0) {
          userData = {
            ...results[0],
          };
        }

        return userData;
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

        res.status(200).json(returnResults);
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
    const currentUserId = currentUser.id;

    const adminPrivilege = this.checkAllowedUsersForSiteMod(currentUser);

    let updatedUserId;
    let bodyErr;

    // We get a body error, but save it as a string for later use. We want the initial error to be
    // access denied before we provide an invalid body error. If the body has everything, we can get
    // the updated user's ID and compare it in the next step.
    if ( !isObject(req.body)
      || !('updatedUser' in req.body)
      || !isObject(req.body.updatedUser)
      || !('id' in req.body.updatedUser)
      || !('data' in req.body.updatedUser)
    ) {
      bodyErr = "User Data Not Provided";
    } else {
      updatedUserId = req.body.updatedUser.id;
    }

    // This determines if the user is even allowed to update the data. Admins are allowed
    // to update any user. Any other user type can only update their own user data.
    if (!adminPrivilege && currentUserId !== updatedUserId) {
      send401Error(res, accessDenied);
      return Promise.resolve(accessDenied);
    }

    if (bodyErr) {
      send400Error(res, bodyErr);
      return Promise.resolve(bodyErr);
    }

    // If the user is not an admin, we only allow them to save some of their user data.
    // They can only change their email address, their password and their userMeta information.
    let updatedUserData;
    if (!adminPrivilege) {
      updatedUserData = {};
      if ("password" in req.body.updatedUser.data) {
        updatedUserData.password = req.body.updatedUser.data.password;
      }
      if ("email" in req.body.updatedUser.data) {
        updatedUserData.email = req.body.updatedUser.data.email;
      }
      if ("userMeta" in req.body.updatedUser.data) {
        updatedUserData.userMeta = req.body.updatedUser.data.userMeta;
      }
    } else {
      updatedUserData = {
        ...req.body.updatedUser.data,
      };
    }

    // We start the promise chain here. We will add chains to the chain depending on who or what
    // is being sent to the edit function
    let p;

    // If the password is in the udpatedUserData or the user doesn't have administrative
    // privileges, we need to check the current user's password's validity.
    if ('password' in updatedUserData || !adminPrivilege) {

      if ('password' in updatedUserData
        && isString(updatedUserData.password)
        && updatedUserData.password.length < this.passwordLengthMin
      ) {
        const err = "Password length is too short";
        send400Error(res, err);
        return Promise.resolve(err);
      }

      // If the user wants to update their password, their old password MUST be included
      // in the request body so that we can authenticate the user. We also check their old
      // password to make sure it's correct. We only let a user update their password if they
      // type in their current password too.
      if (!("currentUserPassword" in req.body.updatedUser)) {
        const err = "Current User's Password Not Provided";
        send400Error(res, err);
        return Promise.resolve(err);
      }

      p = this.getUserById(currentUserId)
        .then((result) => {
          // This will be null if the user id doesn't exist
          if (!result) {
            throw invalidCredentials;
          }

          return bcrypt.compare(req.body.updatedUser.currentUserPassword, result.password);
        })
        .then((result) => {
          // This will be false if the passwords don't match
          if (!result) {
            throw invalidCredentials;
          }

          // Here, we process the new password if it's included in the edited user's info
          if ('password' in updatedUserData) {
            return bcrypt.hash(updatedUserData.password, 12)
              .then((passResult) => {
                updatedUserData.password = passResult;
              });
          }

          return Promise.resolve();
        });

    } else {
      p = Promise.resolve();
    }

    return p.then(() => {
      let query = "UPDATE users SET ";
      const queryParams = [];

      if ('username' in updatedUserData) {
        query += "username = ?, ";
        queryParams.push(updatedUserData.username);
      }

      if ('password' in updatedUserData) {
        query += "password = ?, ";
        queryParams.push(updatedUserData.password);
      }

      if ('firstName' in updatedUserData) {
        query += "firstName = ?, ";
        queryParams.push(updatedUserData.firstName);
      }

      if ('lastName' in updatedUserData) {
        query += "lastName = ?, ";
        queryParams.push(updatedUserData.lastName);
      }

      if ('email' in updatedUserData) {
        query += "email = ?, ";
        queryParams.push(updatedUserData.email);
      }

      if ('userType' in updatedUserData) {
        query += "userType = ?, ";
        queryParams.push(updatedUserData.userType);
      }

      if ('enabled' in updatedUserData) {
        query += "enabled = ?, ";
        queryParams.push(updatedUserData.enabled);
      }

      if ('userMeta' in updatedUserData) {
        query += "userMeta = ?, ";
        queryParams.push(JSON.stringify(updatedUserData.userMeta));
      }

      const now = new Date();
      query += "dateUpdated = ? WHERE id = ?";
      queryParams.push(now);
      queryParams.push(updatedUserId);

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
        } else if (err === invalidCredentials) {
          send400Error(res, invalidCredentials);
        } else {
          console.log(err);
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
