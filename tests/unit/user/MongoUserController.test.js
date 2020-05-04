/* eslint-disable no-unused-vars */
const express = require("express");
const bcrypt = require('bcryptjs');
const http = require("http");
const jwt = require('jsonwebtoken');
const {
  MongoClient,
  findToArray, // Mock Implementation of toArray in MongoDb
  findOne,
  find,
  deleteOne,
  insertOne,
  updateOne,
  collection,
  ObjectId,
} = require("mongodb");

const MongoUserController = require("../../../user/MongoUserController");
const PluginHandler = require("../../../plugin-handler");

const utilities = require("../../../utilities");

const jwtSecret = "69";
global.jwtSecret = jwtSecret;
const invalidCredentials = "Invalid Credentials";

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

describe("MongoUserController", () => {
  let db;
  let ph;
  let router;
  let muc;

  let req;
  let res;

  beforeEach(() => {
    ph = new PluginHandler();
    const mc = new MongoClient();
    db = {
      type: "mongodb",
      instance: mc,
    };

    muc = new MongoUserController(db, ph);
    res = new http.ServerResponse();

    MongoClient.prototype.db.mockClear();
    collection.mockClear();

    req = {
      _authData: null,
    };

    ObjectId.mockClear();
    bcrypt.compare.mockClear();
    bcrypt.hash.mockClear();
    insertOne.mockClear();
    findOne.mockClear();
    find.mockClear();
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
    test("When a new MongoUserController is instantiated, several parameters are saved in the constructor and several routes are added", () => {
      muc = new MongoUserController(db, ph);
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
      expect(router.get).toHaveBeenNthCalledWith(2, '/get-all-users/:page*?', utilities.errorIfTokenDoesNotExist, expect.any(Function));

      expect(muc.db).toBe(db);
    });

    test("When a new MongoUserController is created with a a non-MongoClient database instance, the program will end", () => {
      db.instance = {};
      muc = new MongoUserController(db, ph);
      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test("When a new MongoUserController is created without a database argument, the program will end", () => {
      muc = new MongoUserController();
      expect(mockExit).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("authenticateUserCredentials", () => {
    test("authenticateUserCredentials will run findOne on a username, compare the passed password to the hashed password, then create a JWT before sending it as a part of the result", (done) => {
      const username = "test username";
      const password = "test password";
      req.body = {
        username,
        password,
      };
      const userData = {
        _id: "abc",
        username,
        userType: "userType",
        password: "AbcDef",
      };
      const token = "a token!";

      findOne.mockImplementationOnce(async () => {
        return userData;
      });
      bcrypt.compare.mockImplementationOnce(async () => {
        return true;
      });
      jwt.sign.mockImplementationOnce(() => {
        return token;
      });

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ username });
          expect(bcrypt.compare).toHaveBeenCalledTimes(1);
          expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, userData.password);
          expect(jwt.sign).toHaveBeenCalledTimes(1);
          expect(jwt.sign).toHaveBeenCalledWith(
            {
              _id: userData._id,
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
      const password = "test password";
      req.body = {
        password,
      };

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });
          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if password isn't included in the request", (done) => {
      const username = "test password";
      req.body = {
        username,
      };

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });
          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if no body is included in the request", (done) => {
      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });
          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if findOne returns no results", (done) => {
      const username = "test username";
      const password = "test password";
      req.body = {
        username,
        password,
      };

      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ username });
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

    test("authenticateUserCredentials will send a 500 error if findOne throws an error", (done) => {
      const username = "test username";
      const password = "test password";
      req.body = {
        username,
        password,
      };

      const error = "A test error";

      findOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ username });
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
      const username = "test username";
      const password = "test password";
      req.body = {
        username,
        password,
      };

      const userData = {
        _id: "abc",
        username,
        userType: "userType",
        password: "AbcDef",
      };

      findOne.mockImplementationOnce(async () => {
        return userData;
      });

      bcrypt.compare.mockImplementationOnce(async () => {
        return false;
      });

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ username });
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
      const username = "test username";
      const password = "test password";
      req.body = {
        username,
        password,
      };

      const error = "A test error";
      const userData = {
        _id: "abc",
        username,
        userType: "userType",
        password: "AbcDef",
      };

      findOne.mockImplementationOnce(async () => {
        return userData;
      });

      bcrypt.compare.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ username });
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
    test("getUser will run findOne and return results. If a password is in the results, the return will be sans password", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      const idObj = "An object";
      ObjectId.mockImplementationOnce(() => {
        return idObj;
      });

      const findResult = {
        test: "test",
        user: "user",
      };
      findOne.mockImplementationOnce(() => {
        return Promise.resolve({
          ...findResult,
          password: "abc",
        });
      });

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(findResult);
          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ _id: idObj });
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

      const idObj = "An object";
      ObjectId.mockImplementationOnce(() => {
        return idObj;
      });

      const findResult = {
        test: "test",
        user: "user",
      };
      findOne.mockImplementationOnce(() => {
        return Promise.resolve({
          ...findResult,
        });
      });

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(findResult);
          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({ _id: idObj });
          done();
        });
    });

    test("getUser will return a 401 error if the userType of the user making the request is not allowed to make this request", (done) => {
      req._authData = {
        userType: 'viewer',
      };

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "" });

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUser will return a 400 error if there is no id in the request", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {};

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "User Id Not Provided" });

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUser will return a 400 error if the id is not valid", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };
      ObjectId.mockImplementationOnce(() => {
        throw "Mock ObjectId Error";
      });

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Invalid User Id" });

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(req.params.id);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUser will return a 500 error if findOne throws an error", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      const idObj = "An object";
      ObjectId.mockImplementationOnce(() => {
        return idObj;
      });

      const error = "Test Error";
      findOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Database Error" });

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(req.params.id);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({
            _id: idObj,
          });
          done();
        });
    });

    test("getUser will return a 400 error if findOne returns no data", (done) => {
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        id: "abc",
      };

      const idObj = "An object";
      ObjectId.mockImplementationOnce(() => {
        return idObj;
      });

      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      muc.getUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Invalid User Id" });

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(req.params.id);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({
            _id: idObj,
          });
          done();
        });
    });

  });

  describe("getAllUsers", () => {
    test("getAllUsers will send a 200 status and return an array of user data if the user can receive all the data", (done) => {
      const page = 5;
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        page,
      };

      const findResult = [
        { user: "user1", type: 'viewer' },
        { user: "user2", type: 'admin' },
      ];
      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(findResult);
      });

      muc.getAllUsers(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            users: findResult,
          });

          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith(
            {},
            {
              projection: { password: 0 },
              skip: ((page - 1) * muc.pagination),
              limit: muc.pagination,
            }
          );

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          done();
        });
    });

    test("getAllUsers will default to 1 for various permutations of page in params", (done) => {
      req._authData = {
        userType: 'admin',
      };

      const findResult = [
        { user: "user1", type: 'viewer' },
        { user: "user2", type: 'admin' },
      ];
      findToArray.mockImplementationOnce(() => {
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

      const p1 = muc.getAllUsers(req1, res);
      const p2 = muc.getAllUsers(req2, res);
      const p3 = muc.getAllUsers(req3, res);

      Promise.all([p1, p2, p3])
        .then(() => {
          expect(find).toHaveBeenNthCalledWith(
            1,
            {},
            {
              projection: { password: 0 },
              skip: ((1 - 1) * muc.pagination),
              limit: muc.pagination,
            }
          );
          expect(find).toHaveBeenNthCalledWith(
            2,
            {},
            {
              projection: { password: 0 },
              skip: ((1 - 1) * muc.pagination),
              limit: muc.pagination,
            }
          );
          expect(find).toHaveBeenNthCalledWith(
            3,
            {},
            {
              projection: { password: 0 },
              skip: ((1 - 1) * muc.pagination),
              limit: muc.pagination,
            }
          );

          done();
        });
    });

    test("getAllUsers will send a 401 if the user making a request is not allowed to", (done) => {
      req._authData = {
        userType: 'viewer',
      };

      muc.getAllUsers(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "",
          });

          expect(find).toHaveBeenCalledTimes(0);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getAllUsers with send a 500 error if toArray throws an error", (done) => {
      req._authData = {
        userType: 'admin',
      };
      findToArray.mockImplementationOnce(() => {
        return Promise.reject();
      });

      muc.getAllUsers(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Database Error",
          });

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");
          done();
        });
    });

  });

  describe("addUser", () => {
    let returnObjectId;
    let toString;
    const idString = "new_user_69";

    beforeEach(() => {
      toString = jest.fn(() => {
        return idString;
      });
      returnObjectId = {
        insertedCount: 1,
        insertedId: {
          toString,
        },
      };
    });

    test("addUser will run bcrypt.hash, insertOne, send a 200 code and a specific message if a properly structured request is sent", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
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

      insertOne.mockImplementationOnce(() => {
        return Promise.resolve(returnObjectId);
      });

      muc.addUser(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newUser,
            password: hashedPass,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Added Successfully",
            userId: idString,
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

      insertOne.mockImplementationOnce(() => {
        return Promise.resolve(returnObjectId);
      });

      muc.addUser(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newUser,
            enabled: true,
            userType: 'subscriber',
            password: hashedPass,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Added Successfully",
            userId: idString,
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
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };

      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Access Denied",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains no body", (done) => {
      req._authData = {
        userType: "admin",
      };

      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains a body that is not an object", (done) => {
      req._authData = {
        userType: "admin",
      };

      req.body = [];
      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the request contains a body that contains no newUser", (done) => {
      req._authData = {
        userType: "admin",
      };

      req.body = {};
      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("addUser will send a 400 error if the newUser object contains no username", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        // username: "test user",
        password: "test password",
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

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
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "User Data Not Provided",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

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
        userType: "viewer",
        enabled: true,
      };
      req.body = {
        newUser,
      };
      muc.addUser(req, res)
        .then(() => {
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Password length is too short",
          });

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

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
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New User",
          });

          done();
        });
    });

    test("addUser will send a 500 error if insertOne throws a non-specific error", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
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

      insertOne.mockImplementationOnce(() => {
        return Promise.reject();
      });

      muc.addUser(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newUser,
            password: hashedPass,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New User",
          });

          done();
        });
    });

    test("addUser will send a 401 error if insertOne throws a specific error", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
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

      const error = {
        errmsg: "E11000 User Already Exists",
      };
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.addUser(req, res)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(req.body.newUser.password, 12);
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newUser,
            password: hashedPass,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Username Already Exists",
          });

          done();
        });
    });
  });

  describe("deleteUser", () => {});

  describe("editUser", () => {});

});
