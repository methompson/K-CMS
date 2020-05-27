const express = require("express");
const bcrypt = require('bcryptjs');
const http = require("http");
const jwt = require('jsonwebtoken');
const mysql = require("mysql2");

const MySQLUserController = require("../../../../k-cms/user/MySQLUserController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

const utilities = require("../../../../k-cms/utilities");

const jwtSecret = "69";
global.jwtSecret = jwtSecret;
const invalidCredentials = "Invalid Credentials";
const userDataNotProvided = "User Data Not Provided";
const accessDenied = "Access Denied";

jest.mock("http", () => {
  const json = jest.fn(() => {});
  const status = jest.fn(() => {
    return { json };
  });

  function ServerResponse() {}
  ServerResponse.prototype.status = status;

  return {
    ServerResponse,
    json,
    status,
  };
});

const { json, status } = http;

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

describe("MySQLUserController", () => {
  let db;
  let ph;
  let router;
  let muc;

  let req;
  let res;

  beforeEach(() => {
    ph = new PluginHandler();
    const mp = mysql.createPool();
    db = {
      type: "mysql",
      instance: mp,
    };

    muc = new MySQLUserController(db, ph);
    res = new http.ServerResponse();

    mysql.execute.mockClear();
    mysql.createPool.mockClear();
    mysql.Pool.prototype.promise.mockClear();

    req = {
      _authData: null,
    };

    bcrypt.compare.mockClear();
    bcrypt.hash.mockClear();
    jwt.sign.mockClear();
    status.mockClear();
    json.mockClear();

    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    mockExit.mockClear();
  });

  describe("Instantiation", () => {
    test("When a new MySQLUserController is instantiated, several parameters are saved in the constructor and several routes are added", () => {
      muc = new MySQLUserController(db, ph);
      expect(muc.pluginHandler).toBe(ph);
      expect(muc.pluginHandler instanceof PluginHandler).toBe(true);
      expect(muc.userViewers).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
        'editor',
      ]));
      expect(muc.userEditors).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
      ]));

      expect(muc.passwordLengthMin).toEqual(expect.any(Number));
      expect(muc.passwordLengthMin).toBeGreaterThanOrEqual(8);
      expect(muc.pagination).toEqual(expect.any(Number));
      expect(muc.jwtAlg).toBe("HS256");

      expect(router.post).toHaveBeenCalledTimes(4);
      expect(router.get).toHaveBeenCalledTimes(2);

      expect(router.post).toHaveBeenNthCalledWith(1, '/login', expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/add-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/edit-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(4, '/delete-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));

      expect(router.get).toHaveBeenNthCalledWith(1, '/get-user/:id', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/all-users/:page*?', utilities.errorIfTokenDoesNotExist, expect.any(Function));

      expect(muc.db).toBe(db);
    });

    test("When a new MySQLUserController is created with a a non-Mysql Pool database instance, the program will end", () => {
      db.instance = {};
      muc = new MySQLUserController(db, ph);
      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test("When a new MySQLUserController is created without a database argument, the program will end", () => {
      muc = new MySQLUserController();
      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("authenticateUserCredentials", () => {

    const sqlQuery = `
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

    const username = "test username";
    const password = "test password";

    const userData = {
      id: 69,
      username,
      userType: "userType",
      password: "AbcDef",
    };

    test("authenticateUserCredentials will run execute with a query finding a username, compare the passed password to the hashed password, then create a JWT before sending it as a part of the result", (done) => {
      req.body = {
        username,
        password,
      };

      const token = "a token!";

      bcrypt.compare.mockImplementationOnce(async () => {
        return true;
      });
      jwt.sign.mockImplementationOnce(() => {
        return token;
      });
      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[userData]]);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [userData.username]);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);

          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, userData.password);
          expect(jwt.sign).toHaveBeenCalledTimes(1);
          expect(jwt.sign).toHaveBeenCalledWith(
            {
              id: userData.id,
              username: userData.username,
              userType: userData.userType,
            },
            jwtSecret,
            {
              expiresIn: '4h',
              algorithm: muc.jwtAlg,
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ token });
          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if username isn't included in the request", (done) => {
      req.body = {
        password,
      };

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if password isn't included in the request", (done) => {
      req.body = {
        username,
      };

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if no body is included in the request", (done) => {
      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if execute returns no results", (done) => {
      req.body = {
        username,
        password,
      };

      mysql.execute.mockImplementationOnce(() => {
        const rows = [];
        return Promise.resolve([rows]);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(invalidCredentials);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.body.username]);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: invalidCredentials,
          });

          done();
        });
    });

    test("authenticateUserCredentials will send a 500 error if execute throws an error", (done) => {
      req.body = {
        username,
        password,
      };

      const error = "A test error";

      mysql.execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.body.username]);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if bcrypt.compare returns a false result", (done) => {
      req.body = {
        username,
        password,
      };

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[userData]]);
      });

      bcrypt.compare.mockImplementationOnce(async () => {
        return false;
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(invalidCredentials);

          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [userData.username]);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);

          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, userData.password);

          expect(jwt.sign).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: invalidCredentials,
          });

          done();
        });
    });

    test("authenticateUserCredentials will send a 500 error if bcrypt.compare throws an error", (done) => {
      req.body = {
        username,
        password,
      };

      const error = "A test error";

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[userData]]);
      });

      bcrypt.compare.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [userData.username]);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);

          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, userData.password);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

  });

  describe("getUser", () => {
    const sqlQuery = `
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

    const id = 69;
    let findResult;

    beforeEach(() => {
      findResult = {
        id,
        test: "test",
        user: "user",
        password: "69",
      };
    });

    test("getUser will run execute and return results. If a password is in the results, the return will be sans password", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id,
      };

      const returnedData = {
        ...findResult,
      };

      delete returnedData.password;

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[findResult]]);
      });

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(returnedData);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.id]);

          done();
        });
    });

    test("getUser will run findOne and return results", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      delete findResult.password;

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[findResult]]);
      });

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(findResult);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.id]);

          done();
        });
    });

    test("getUser will return a 401 error if the userType of the user making the request is not allowed to make this request", (done) => {
      req._authData = {
        userType: 'viewer',
      };

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: accessDenied });

          expect(mysql.execute).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUser will return a 400 error if there is no id in the request", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {};

      const error = "User Id Not Provided";
      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          expect(mysql.execute).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUser will return a 500 error if execute throws an error", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      const error = "Test Error";
      mysql.execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Database Error" });

          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.id]);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);

          done();
        });
    });

    test("getUser will return a 404 error if execute returns no data", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([[]]);
      });

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(404);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(404);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Page Not Found" });

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.id]);

          done();
        });
    });

  });

  describe("getAllUsers", () => {

    const sqlQuery = `
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

    test("getAllUsers will send a 200 status and return an array of user data if the user can receive all the data", (done) => {
      const page = 5;
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        page,
      };

      const findResult = [
        { user: "user1", type: 'viewer', password: "69" },
        { user: "user2", type: 'admin', password: "96" },
      ];
      const returnResults = [];
      findResult.forEach((el) => {
        const user = { ...el };
        delete user.password;
        returnResults.push(user);
      });

      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([findResult]);
      });

      const { pagination } = muc;

      muc.getAllUsers(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            users: returnResults,
          });

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [pagination, pagination * (page - 1)]);

          done();
        });
    });

    test("getAllUsers will default the pagination to 1 for various permutations of page in params", (done) => {
      req._authData = {
        userType: 'admin',
      };

      const findResult = [
        { user: "user1", type: 'viewer' },
        { user: "user2", type: 'admin' },
      ];
      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve(findResult);
      })
        .mockImplementationOnce(() => {
          return Promise.resolve(findResult);
        })
        .mockImplementationOnce(() => {
          return Promise.resolve(findResult);
        });

      const req1 = { ...req };
      const req2 = { ...req, params: {} };
      const req3 = { ...req, params: { page: true } };

      const p1 = muc.getAllUsers(req1, res).then((result) => { expect(result).toBe(200); });
      const p2 = muc.getAllUsers(req2, res).then((result) => { expect(result).toBe(200); });
      const p3 = muc.getAllUsers(req3, res).then((result) => { expect(result).toBe(200); });

      const { pagination } = muc;

      Promise.all([p1, p2, p3])
        .then(() => {
          expect(mysql.execute).toHaveBeenNthCalledWith(1, sqlQuery, [pagination, 0]);
          expect(mysql.execute).toHaveBeenNthCalledWith(2, sqlQuery, [pagination, 0]);
          expect(mysql.execute).toHaveBeenNthCalledWith(3, sqlQuery, [pagination, 0]);

          done();
        });
    });

    test("getAllUsers will send a 401 if the user making a request is not allowed to", (done) => {
      req._authData = {
        userType: 'viewer',
      };

      muc.getAllUsers(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: accessDenied });

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("getAllUsers with send a 500 error if execute throws an error", (done) => {
      req._authData = {
        userType: 'admin',
      };

      const error = "Test ERror";
      mysql.execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const { pagination } = muc;

      muc.getAllUsers(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Database Error",
          });

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);

          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [pagination, 0]);

          done();
        });
    });

  });

  describe("addUser", () => {
    test("addUser will run bcrypt.hash, insertOne, send a 200 code and a specific message if a properly structured request is sent", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };

      const hashedPass = "abc123_69";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashedPass);
      });

      let sqlQuery = "INSERT INTO users (username, email, password, userType, enabled";
      let values = "VALUES (?, ?, ?, ?, ?";
      const queryParams = [
        newUser.username,
        newUser.email,
        hashedPass,
        newUser.userType,
        newUser.enabled,
        expect.any(Date),
        expect.any(Date),
      ];
      sqlQuery += ", dateAdded, dateUpdated)";
      values += ", ?, ?)";

      const userId = 69;
      mysql.execute.mockImplementationOnce(() => {
        const results = {
          affectedRows: 1,
          insertId: userId,
        };
        return Promise.resolve([
          results,
        ]);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(`${sqlQuery} ${values}`, queryParams);

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Added Successfully",
            id: userId,
          });

          done();
        });
    });

    test("addUser will default to a subscriber userType if a userType is not specified in the newUser object and default to enabled being true if enabled is not included", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@email.io",
        // userType: "viewer",
        // enabled: true,
      };
      req.body = {
        newUser,
      };

      const hashedPass = "abc123_69";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashedPass);
      });

      let sqlQuery = "INSERT INTO users (username, email, password, userType, enabled";
      let values = "VALUES (?, ?, ?, ?, ?";
      const queryParams = [
        newUser.username,
        newUser.email,
        hashedPass,
        "subscriber",
        true,
        expect.any(Date),
        expect.any(Date),
      ];
      sqlQuery += ", dateAdded, dateUpdated)";
      values += ", ?, ?)";

      const userId = 69;
      mysql.execute.mockImplementationOnce(() => {
        const results = {
          affectedRows: 1,
          insertId: userId,
        };
        return Promise.resolve([
          results,
        ]);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(`${sqlQuery} ${values}`, queryParams);

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Added Successfully",
            id: userId,
          });

          done();
        });
    });

    test("addUser will send a 401 error if the user making the request is not allowed to make the request", (done) => {
      req._authData = {
        userType: "viewer",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: accessDenied,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains no body", (done) => {
      req._authData = {
        userType: "admin",
      };

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains a body that is not an object", (done) => {
      req._authData = {
        userType: "admin",
      };

      req.body = [];
      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains a body that contains no newUser", (done) => {
      req._authData = {
        userType: "admin",
      };

      req.body = {};
      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the newUser object contains no username", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        // username: "test user",
        email: "test@email.io",
        password: "test password",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the newUser object contains no password", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        // password: "test password",
        email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the newUser object contains no email", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        // email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the newUser object contains a password shorter than the passwordLengthMin", (done) => {
      req._authData = {
        userType: "admin",
      };

      let password = "";

      for (let x = 0, len = muc.passwordLengthMin - 1; x < len; ++x) {
        password += '1';
      }

      const newUser = {
        username: "test user",
        password,
        email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };

      const error = "Password length is too short";

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 500 error if bcrypt.hash throws an error", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@email.io",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };

      const hashedPass = "abc123_69";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.reject(hashedPass);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(hashedPass);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding User",
          });

          done();
        });
    });

    describe("Execute Errors", () => {
      let newUser;
      let sqlQuery;
      let values;
      let queryParams;
      const hashedPass = "abc123_69";

      beforeEach(() => {
        req._authData = {
          userType: "admin",
        };

        newUser = {
          username: "test user",
          password: "test password",
          email: "test@email.io",
          userType: "viewer",
          enabled: true,
        };
        req.body = {
          newUser,
        };

        sqlQuery = "INSERT INTO users (username, email, password, userType, enabled";
        values = "VALUES (?, ?, ?, ?, ?";
        queryParams = [
          newUser.username,
          newUser.email,
          hashedPass,
          newUser.userType,
          newUser.enabled,
          expect.any(Date),
          expect.any(Date),
        ];
        sqlQuery += ", dateAdded, dateUpdated)";
        values += ", ?, ?)";

      });

      test("addUser will send a 500 error if execute throws a non-specific error", (done) => {

        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashedPass);
        });

        const error = "Test Error";
        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        muc.addUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(`${sqlQuery} ${values}`, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Error Adding User",
            });

            done();
          });
      });

      test("addUser will send a 400 error if execute throws a specific error re duplicate emails", (done) => {
        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashedPass);
        });

        const error = {
          code: "ER_DUP_ENTRY",
          message: "Duplicate entry 'test@test.test' for key 'users.email'",
        };
        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        muc.addUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(`${sqlQuery} ${values}`, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Email Already Exists",
            });

            done();
          });
      });

      test("addUser will send a 400 error if execute throws a specific error re duplicate usernames", (done) => {
        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashedPass);
        });

        const error = {
          code: "ER_DUP_ENTRY",
          message: "Duplicate entry 'test@test.test' for key 'users.username'",
        };
        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        muc.addUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(`${sqlQuery} ${values}`, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Username Already Exists",
            });

            done();
          });
      });

    });

  });

  describe("editUser", () => {

    test("editUser will send a 200 code and run updateOne if correct data is passed to it", (done) => {
      req._authData = {
        userType: "admin",
      };

      const userId = "69";
      const updatedUser = {
        id: userId,
        data: {
          username: "test user",
          password: "test password",
          userType: "viewer",
          enabled: true,
        },
      };

      const hashPass = "hashed pass";

      const sqlQuery = "UPDATE users SET "
        + "username = ?, "
        + "password = ?, "
        + "userType = ?, "
        + "enabled = ?, "
        + "dateUpdated = ? WHERE id = ?";

      const queryParams = [
        updatedUser.data.username,
        hashPass,
        updatedUser.data.userType,
        updatedUser.data.enabled,
        expect.any(Date),
        updatedUser.id,
      ];

      req.body = {
        updatedUser,
      };

      const queryResult = {
        affectedRows: 1,
      };
      mysql.execute.mockImplementation(() => {
        return Promise.resolve([queryResult]);
      });

      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Updated Successfully",
          });

          done();
        });
    });

    test("editUser will send a 200 code and run updateOne if correct data is passed to it. bcrypt.hash will not be run if a password is not included", (done) => {
      req._authData = {
        userType: "admin",
      };

      const userId = "69";
      const updatedUser = {
        id: userId,
        data: {
          username: "test user",
          // password: "test password",
          userType: "viewer",
          enabled: true,
        },
      };

      const hashPass = "hashed pass";

      const sqlQuery = "UPDATE users SET "
        + "username = ?, "
        // + "password = ?, "
        + "userType = ?, "
        + "enabled = ?, "
        + "dateUpdated = ? WHERE id = ?";

      const queryParams = [
        updatedUser.data.username,
        // hashPass,
        updatedUser.data.userType,
        updatedUser.data.enabled,
        expect.any(Date),
        updatedUser.id,
      ];

      req.body = {
        updatedUser,
      };

      const queryResult = {
        affectedRows: 1,
      };
      mysql.execute.mockImplementation(() => {
        return Promise.resolve([queryResult]);
      });

      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Updated Successfully",
          });

          done();
        });
    });

    test("editUser will send a 401 code if the user making the request is not allowed to make the request", (done) => {
      req._authData = {
        userType: "subscriber",
      };

      const userId = "69";
      const updatedUser = {
        id: userId,
        data: {
          username: "test user",
          password: "test password",
          userType: "viewer",
          enabled: true,
        },
      };

      req.body = {
        updatedUser,
      };

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Access Denied",
          });

          done();
        });
    });

    test("editUser will send a 400 code if there's no data in the updatedUser object", (done) => {
      req._authData = {
        userType: "admin",
      };

      const userId = "69";
      const updatedUser = {
        id: userId,
      };

      req.body = {
        updatedUser,
      };

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("editUser will send a 400 code if there's no id in the updatedUser object", (done) => {
      req._authData = {
        userType: "admin",
      };

      const updatedUser = {
        data: {
          username: "test user",
          password: "test password",
          userType: "viewer",
          enabled: true,
        },
      };

      req.body = {
        updatedUser,
      };

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("editUser will send a 400 code if there's no updatedUser Object in the body object", (done) => {
      req._authData = {
        userType: "admin",
      };

      req.body = {};

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("editUser will send a 400 code if there's no body object", (done) => {
      req._authData = {
        userType: "admin",
      };

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("editUser will send a 400 code if the password included in the updatedUser object is too short", (done) => {
      req._authData = {
        userType: "admin",
      };

      req._authData = {
        userType: "admin",
      };

      let password = "";
      for (let x = 0, len = muc.passwordLengthMin - 1; x < len; ++x) {
        password += "1";
      }

      const userId = "69";
      const updatedUser = {
        id: userId,
        data: {
          username: "test user",
          password,
          userType: "viewer",
          enabled: true,
        },
      };

      req.body = {
        updatedUser,
      };

      const error = "Password length is too short";
      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    describe("Execute Errors", () => {
      const userId = "69";
      const updatedUser = {
        id: userId,
        data: {
          username: "test user",
          password: "test password",
          userType: "viewer",
          enabled: true,
        },
      };

      const hashPass = "hashed pass";

      const sqlQuery = "UPDATE users SET "
        + "username = ?, "
        + "password = ?, "
        + "userType = ?, "
        + "enabled = ?, "
        + "dateUpdated = ? WHERE id = ?";

      const queryParams = [
        updatedUser.data.username,
        hashPass,
        updatedUser.data.userType,
        updatedUser.data.enabled,
        expect.any(Date),
        updatedUser.id,
      ];

      beforeEach(() => {
        req._authData = {
          userType: "admin",
        };

        req.body = {
          updatedUser,
        };
      });

      test("editUser will send a 500 code if Execute throws a non-specific error", (done) => {
        const error = "Test Error";

        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashPass);
        });

        muc.editUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(500);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Error Updating User",
            });

            done();
          });
      });

      test("editUser will send a 401 code if execute throws a specific error re duplicate email", (done) => {
        const error = {
          code: "ER_DUP_ENTRY",
          message: "Duplicate entry 'test@test.test' for key 'users.email'",
        };
        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashPass);
        });

        muc.editUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Email Already Exists",
            });

            done();
          });
      });

      test("editUser will send a 401 code if execute throws a specific error re duplicate username", (done) => {
        const error = {
          code: "ER_DUP_ENTRY",
          message: "Duplicate entry 'test@test.test' for key 'users.username'",
        };
        mysql.execute.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        bcrypt.hash.mockImplementationOnce(() => {
          return Promise.resolve(hashPass);
        });

        muc.editUser(req, res)
          .then((result) => {
            expect(result).toBe(error);

            expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledTimes(1);
            expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

            expect(bcrypt.hash).toHaveBeenCalledTimes(1);
            expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error: "Username Already Exists",
            });

            done();
          });
      });
    });

  });

  describe("deleteUser", () => {
    const sqlQuery = "DELETE FROM users WHERE id = ? LIMIT 1";

    test("deleteUser will run execute with a query and then send a 200 code when proper data is passed to the end point", (done) => {
      req._authData = {
        userType: "admin",
      };

      const delId = 69;
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const delResults = {
        affectedRows: 1,
      };
      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([delResults]);
      });

      const queryParams = [delId];

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Deleted Successfully",
          });

          done();
        });
    });

    test("deleteUser will send a 400 error if no user is deleted", (done) => {
      req._authData = {
        userType: "admin",
      };

      const delId = 69;
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const delResults = {
        affectedRows: 0,
      };
      mysql.execute.mockImplementationOnce(() => {
        return Promise.resolve([delResults]);
      });

      const queryParams = [delId];

      const error = "User Was Not Deleted";

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("deleteUser will send a 401 error if the user making a request is not allowed to make the request", (done) => {
      req._authData = {
        userType: "viewer",
        id: 69,
      };

      const delId = 96;
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: accessDenied });

          done();
        });

    });

    test("deleteUser will send a 400 error if the request contains no body", (done) => {
      req._authData = {
        userType: "admin",
        id: 69,
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });

    });

    test("deleteUser will send a 400 error if the request contains a body, but no deletedUser", (done) => {
      req._authData = {
        userType: "admin",
        id: 69,
      };

      req.body = {};

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });
    });

    test("deleteUser will send a 400 error if the request contains a body, but no id in the deletedUser", (done) => {
      req._authData = {
        userType: "admin",
        id: 69,
      };

      req.body = {
        deletedUser: {},
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: userDataNotProvided });

          done();
        });

    });

    test("deleteUser will send a 400 error if the deletedUser is the same as the user making the request", (done) => {
      const delId = 96;
      req._authData = {
        userType: "admin",
        id: delId,
      };

      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const error = "Cannot Delete Yourself";

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });

    });

    test("deleteUser will send a 500 error if execute throws an error", (done) => {
      req._authData = {
        userType: "admin",
        id: 69,
      };

      const delId = 96;
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const error = {
        error: "Test Error",
      };
      mysql.execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const queryParams = [delId];

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Error Deleting User" });

          done();
        });

    });

  });

});
