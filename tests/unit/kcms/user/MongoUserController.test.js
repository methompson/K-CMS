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

const MongoUserController = require("../../../../k-cms/user/MongoUserController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

const utilities = require("../../../../k-cms/utilities");

const jwtSecret = "69";
global.jwtSecret = jwtSecret;
const invalidCredentials = "Invalid Credentials";
const invalidUserId = "Invalid User Id";
const userDataNotProvided = "User Data Not Provided";
const accessDenied = "Access Denied";
const dbError = "Database Error: Improper Results Returned";

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
    updateOne.mockClear();
    findOne.mockClear();
    find.mockClear();
    deleteOne.mockClear();
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
      expect(router.get).toHaveBeenCalledTimes(3);

      expect(router.post).toHaveBeenNthCalledWith(1, '/login', expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/add-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/edit-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(4, '/delete-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));

      expect(router.get).toHaveBeenNthCalledWith(1, '/get-user/:id', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/all-users/:page*?', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(3, '/get-user-types', utilities.errorIfTokenDoesNotExist, expect.any(Function));

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

  const username = "test username";
  describe("authenticateUserCredentials", () => {
    const password = "test password";
    const userData = {
      _id: "abc",
      username,
      userType: "userType",
      password: "AbcDef",
    };

    const dataNotProvided = userDataNotProvided;

    test("authenticateUserCredentials will run findOne on a username, compare the passed password to the hashed password, then create a JWT before sending it as a part of the result", (done) => {
      req.body = {
        username,
        password,
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
        .then((result) => {
          expect(result).toBe(200);

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
              id: userData._id,
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

      const error = dataNotProvided;
      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if password isn't included in the request", (done) => {
      req.body = {
        username,
      };

      const error = dataNotProvided;

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if no body is included in the request", (done) => {
      const error = dataNotProvided;

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(bcrypt.compare).toHaveBeenCalledTimes(0);
          expect(jwt.sign).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("authenticateUserCredentials will send a 401 error if findOne returns no results", (done) => {
      req.body = {
        username,
        password,
      };

      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(invalidCredentials);

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
      req.body = {
        username,
        password,
      };

      const error = "A test error";

      findOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
      req.body = {
        username,
        password,
      };

      findOne.mockImplementationOnce(async () => {
        return userData;
      });

      bcrypt.compare.mockImplementationOnce(async () => {
        return false;
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(invalidCredentials);

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
      req.body = {
        username,
        password,
      };

      const error = "A test error";

      findOne.mockImplementationOnce(async () => {
        return userData;
      });

      bcrypt.compare.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.authenticateUserCredentials(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
          expect(json).toHaveBeenCalledWith({ error });

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

      const returnedResult = {
        ...findResult,
      };

      findResult.password = "69";

      findOne.mockImplementationOnce(() => {
        return Promise.resolve({
          ...findResult,
          password: "abc",
        });
      });

      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(returnedResult);

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
        .then((result) => {
          expect(result).toBe(200);

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
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: accessDenied });

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

      const error = "User Id Not Provided";
      muc.getUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("getUser will return a 400 error if the id is not a valid Mongo ID", (done) => {
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
        .then((result) => {
          expect(result).toBe(invalidUserId);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: invalidUserId });

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
        .then((result) => {
          expect(result).toBe(error);

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

    test("getUser will return a 404 error if findOne returns no data", (done) => {
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
        .then((result) => {
          expect(result).toBe(404);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(404);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "Page Not Found" });

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
    const _id = {
      toString() {
        return "123";
      },
    };

    test("getAllUsers will send a 200 status and return an array of user data if the user can receive all the data", (done) => {
      const page = 5;
      req._authData = {
        userType: 'admin',
      };

      req.params = {
        page,
      };

      const findResult = [
        {
          user: "user1",
          type: 'viewer',
          password: "69",
          _id,
        },
        {
          user: "user2",
          type: 'admin',
          password: "96",
          _id,
        },
      ];
      const returnResults = [];
      findResult.forEach((el) => {
        const user = { ...el };
        user.id = el._id.toString();
        delete user.password;
        returnResults.push(user);
      });

      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(findResult);
      });

      muc.getAllUsers(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(returnResults);

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
        { user: "user1", type: 'viewer', _id },
        { user: "user2", type: 'admin', _id },
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

      const p1 = muc.getAllUsers(req1, res).then((result) => { expect(result).toBe(200); });
      const p2 = muc.getAllUsers(req2, res).then((result) => { expect(result).toBe(200); });
      const p3 = muc.getAllUsers(req3, res).then((result) => { expect(result).toBe(200); });

      Promise.all([p1, p2, p3])
        .then(() => {

          const obj = {
            projection: { password: 0 },
            skip: ((1 - 1) * muc.pagination),
            limit: muc.pagination,
          };

          expect(find).toHaveBeenNthCalledWith(1, {}, obj);
          expect(find).toHaveBeenNthCalledWith(2, {}, obj);
          expect(find).toHaveBeenNthCalledWith(3, {}, obj);

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

      const error = "Server Error";
      findToArray.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.getAllUsers(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
        email: "test@test.test",
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
        .then((result) => {
          expect(result).toBe(200);

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
            id: idString,
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
        email: "test@test.test",
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
        .then((result) => {
          expect(result).toBe(200);

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
            id: idString,
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
        email: "test@test.test",
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
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
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
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
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
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
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
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
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
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
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
        email: "test@test.test",
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
        email: "test@test.test",
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
        email: "test@test.test",
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

      const error = "An Error";
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

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

    test("addUser will send a 400 error if insertOne throws a specific error re duplicate username value", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        errmsg: "E11000 username Already Exists",
      };
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Username Already Exists",
          });

          done();
        });
    });

    test("addUser will send a 400 error if insertOne throws a specific error re duplicate email value", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        errmsg: "E11000 email Already Exists",
      };
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Email Already Exists",
          });

          done();
        });
    });

    test("addUser will send a 500 error if insertOne resolves with a non-object value", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        return Promise.resolve(true);
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

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
            error: dbError,
          });

          done();
        });
    });

    test("addUser will send a 500 error if insertOne resolves with an object, but insertedCount isn't included in it", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        return Promise.resolve({});
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

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
            error: dbError,
          });

          done();
        });
    });

    test("addUser will send a 500 error if insertOne resolves with an object, but insertedCount isn't a number", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        return Promise.resolve({
          insertedCount: "1",
        });
      });

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

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
            error: dbError,
          });

          done();
        });
    });

    test("addUser will send a 400 error if insertOne resolves correctly, but insertedCount is 0", (done) => {
      req._authData = {
        userType: "admin",
      };

      const newUser = {
        username: "test user",
        password: "test password",
        email: "test@test.test",
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
        return Promise.resolve({
          insertedCount: 0,
        });
      });

      const error = "User Was Not Added";

      muc.addUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

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
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve({
          modifiedCount: 1,
        });
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

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

      req.body = {
        updatedUser,
      };

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve({
          modifiedCount: 1,
        });
      });

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
              },
            },
            { upsert: true }
          );

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("editUser will send a 400 code if ObjectId throws an error", (done) => {
      req._authData = {
        userType: "admin",
      };

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

      req.body = {
        updatedUser,
      };

      ObjectId.mockImplementationOnce(() => {
        throw "test error";
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(invalidUserId);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(bcrypt.hash).toHaveBeenCalledTimes(0);
          expect(updateOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: invalidUserId,
          });

          done();
        });
    });

    test("editUser will send a 500 code if updateOne throws a non-specific error", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      const error = "test error";
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Updating User",
          });

          done();
        });
    });

    test("editUser will send a 400 code if updateOne throws a specific error re: username already existing", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      const error = {
        errmsg: "E11000 username already exists",
      };
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Username Already Exists",
          });

          done();
        });
    });

    test("editUser will send a 400 code if updateOne throws a specific error re: email already existing", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      const error = {
        errmsg: "E11000 email already exists",
      };
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Email Already Exists",
          });

          done();
        });
    });

    test("editUser will send a 400 code if updateOne throws a non-specific error re: something already existing", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      const error = {
        errmsg: "E11000 already exists",
      };
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "",
          });

          done();
        });
    });

    test("editUser will send a 500 code if updateOne resolves with a non-object value", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve(true);
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });
    });

    test("editUser will send a 500 code if updateOne resolves with an object without modifiedCount", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve({});
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });
    });

    test("editUser will send a 500 code if updateOne resolves with an object, but modifiedCount is not a number", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve({
          modifiedCount: true,
        });
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });
    });

    test("editUser will send a 400 code if updateOne resolves with an object, and modified count is 0", (done) => {
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

      req.body = {
        updatedUser,
      };

      const objId = "96";
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      updateOne.mockImplementationOnce(() => {
        return Promise.resolve({
          modifiedCount: 0,
        });
      });

      const hashPass = "hashed pass";
      bcrypt.hash.mockImplementationOnce(() => {
        return Promise.resolve(hashPass);
      });

      const error = "User Was Not Updated";

      muc.editUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(bcrypt.hash).toHaveBeenCalledTimes(1);
          expect(bcrypt.hash).toHaveBeenCalledWith(updatedUser.data.password, 12);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(userId);

          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            { _id: objId },
            {
              $set: {
                ...updatedUser.data,
                password: hashPass,
              },
            },
            { upsert: true }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

  });

  describe("deleteUser", () => {
    test("deleteUser will run deleteOne and then send a 200 code when proper data is passed to the end point", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "User Deleted Successfully",
          });

          done();
        });
    });

    test("deleteUser will send a 401 error if the user making a request is not allowed to make the request", (done) => {
      req._authData = {
        userType: "viewer",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(accessDenied);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);
          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Access Denied",
          });

          done();
        });

    });

    test("deleteUser will send a 400 error if the request contains no body", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);
          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          done();
        });

    });

    test("deleteUser will send a 400 error if the request contains a body, but no deletedUser", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      req.body = {};

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);
          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          done();
        });
    });

    test("deleteUser will send a 400 error if the request contains a body, but no id in the deletedUser", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      req.body = {
        deletedUser: {},
      };

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(userDataNotProvided);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);
          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: userDataNotProvided,
          });

          done();
        });

    });

    test("deleteUser will send a 400 error if the deletedUser is the same as the user making the request", (done) => {
      const delId = "96";
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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(ObjectId).toHaveBeenCalledTimes(0);
          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });

    });

    test("deleteUser will send a 500 error if deleteOne throws an error", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      const error = "test Error";
      deleteOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Deleting User",
          });

          done();
        });

    });

    test("deleteUser will send a 500 error if deleteOne resolves a non-object value", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      deleteOne.mockImplementationOnce(() => {
        return Promise.resolve(true);
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });

    });

    test("deleteUser will send a 500 error if deleteOne resolves an object without deletedCount", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      deleteOne.mockImplementationOnce(() => {
        return Promise.resolve({});
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });

    });

    test("deleteUser will send a 500 error if deleteOne resolves an object with deletedCount, but it's not a number", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      deleteOne.mockImplementationOnce(() => {
        return Promise.resolve({
          deletedCount: "1",
        });
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(dbError);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: dbError,
          });

          done();
        });

    });

    test("deleteUser will send a 400 error if deleteOne resolves an object with deletedCount, but its value is 0", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const objId = { id: delId };
      ObjectId.mockImplementationOnce(() => {
        return objId;
      });

      deleteOne.mockImplementationOnce(() => {
        return Promise.resolve({
          deletedCount: 0,
        });
      });

      const error = "User Was Not Deleted";

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("users");

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({ _id: objId });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });

    });

    test("deleteUser will send a 500 error if ObjectId throws an error", (done) => {
      req._authData = {
        userType: "admin",
        id: "96",
      };

      const delId = "69";
      req.body = {
        deletedUser: {
          id: delId,
        },
      };

      const err = "New Error";
      ObjectId.mockImplementationOnce(() => {
        throw err;
      });

      muc.deleteUser(req, res)
        .then((result) => {
          expect(result).toBe(invalidUserId);

          expect(ObjectId).toHaveBeenCalledTimes(1);
          expect(ObjectId).toHaveBeenCalledWith(delId);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);

          expect(deleteOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: invalidUserId,
          });

          done();
        });

    });

  });

});
