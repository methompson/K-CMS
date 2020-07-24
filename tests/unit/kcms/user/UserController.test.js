const express = require("express");
const jwt = require("jsonwebtoken");
const http = require("http");

const UserController = require("../../../../kcms/user/UserController");
const PluginHandler = require("../../../../kcms/plugin-handler");

const utilities = require("../../../../kcms/utilities");

const jwtSecret = "69";
global.jwtSecret = jwtSecret;

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

describe("UserController", () => {
  let uc;
  let ph;
  let router;
  let req;
  let res;
  let next;

  beforeEach(() => {
    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();

    json.mockClear();
    status.mockClear();

    req = { request: "" };
    res = new http.ServerResponse();
    next = () => {};

    ph = new PluginHandler();
    uc = new UserController(ph);
  });

  describe("Instantiation", () => {
    test("When a UserController is created, several parameters are saved in the constructor and several routes are added", () => {
      expect(uc.pluginHandler).toBe(ph);
      expect(uc.pluginHandler instanceof PluginHandler).toBe(true);
      expect(uc.userViewers).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
        'editor',
      ]));
      expect(uc.userEditors).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
      ]));

      expect(uc.passwordLengthMin).toEqual(expect.any(Number));
      expect(uc.passwordLengthMin).toBeGreaterThanOrEqual(8);
      expect(uc.pagination).toEqual(expect.any(Number));
      expect(uc.jwtAlg).toBe("HS256");

      expect(router.post).toHaveBeenCalledTimes(4);
      expect(router.get).toHaveBeenCalledTimes(3);

      expect(router.post).toHaveBeenNthCalledWith(1, '/login', expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/add-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/edit-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(4, '/delete-user', utilities.errorIfTokenDoesNotExist, expect.any(Function));

      expect(router.get).toHaveBeenNthCalledWith(1, '/get-user/:id', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/all-users/:page*?', utilities.errorIfTokenDoesNotExist, expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(3, '/get-user-types', utilities.errorIfTokenDoesNotExist, expect.any(Function));
    });

    test("When a userController is created without a PluginHandler or an invalid PluginHandler, a PluginHandler will be created", () => {
      uc = new UserController();
      expect(uc.pluginHandler instanceof PluginHandler).toBe(true);

      uc = new UserController({});
      expect(uc.pluginHandler instanceof PluginHandler).toBe(true);

      uc = new UserController(69);
      expect(uc.pluginHandler instanceof PluginHandler).toBe(true);

      uc = new UserController([69]);
      expect(uc.pluginHandler instanceof PluginHandler).toBe(true);

      expect(uc.userViewers).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
        'editor',
      ]));
      expect(uc.userEditors).toEqual(expect.arrayContaining([
        'superAdmin',
        'admin',
      ]));
    });
  });

  describe("routes", () => {
    test("routes will return the router", () => {
      expect(uc.routes).toBe(uc.router);
    });

    test("the /login route has one function.", () => {
      const anonyFunc = router.post.mock.calls[0][1];

      const methodSpy = jest.spyOn(uc, "authenticateUserCredentials")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /add-user route has two functions. The second function runs addUser", () => {
      const anonyFunc = router.post.mock.calls[1][2];

      const methodSpy = jest.spyOn(uc, "addUser")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("the /edit-user route has two functions. The second function runs editUser", () => {
      const anonyFunc = router.post.mock.calls[2][2];

      const methodSpy = jest.spyOn(uc, "editUser")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("the /delete-user route has two functions. The second function runs deleteUser", () => {
      const anonyFunc = router.post.mock.calls[3][2];

      const methodSpy = jest.spyOn(uc, "deleteUser")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("the /get-user/:id route has two functions. The second function runs getUser", () => {
      const anonyFunc = router.get.mock.calls[0][2];

      const methodSpy = jest.spyOn(uc, "getUser")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("the /all-users/:page*? route has two functions. The second function runs getAllUsers", () => {
      const anonyFunc = router.get.mock.calls[1][2];

      const methodSpy = jest.spyOn(uc, "getAllUsers")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("the /all-user-types route has two functions. The second function runs getUserTypes", () => {
      const anonyFunc = router.get.mock.calls[2][2];

      const methodSpy = jest.spyOn(uc, "getUserTypes")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res, next);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res, next);
    });

  });

  describe("userTypes", () => {
    test("userTypes will return an array containing all user types. The base types will include 4 types", () => {
      expect(uc.userTypes).toEqual(expect.objectContaining({
        superAdmin: expect.any(Object),
        admin: expect.any(Object),
        editor: expect.any(Object),
        subscriber: expect.any(Object),
      }));
    });

    test("When additionalUserRoles are defined, those users will also be included in userTypes", () => {
      uc.additionalUserRoles = {
        user1: {},
        user2: {},
        user69: {},
      };

      expect(uc.userTypes).toEqual(expect.objectContaining({
        user1: expect.any(Object),
        user2: expect.any(Object),
        user69: expect.any(Object),
      }));
    });
  });

  describe("getUserTypes", () => {

    test("If the user is of a userType that allows them to modify the site, getUserTypes will send the user types as an array", () => {
      req._authData = {
        userType: "admin",
      };

      const { userTypes } = uc;
      const userTypeNames = Object.keys(userTypes);
      const result = uc.getUserTypes(req, res);

      expect(result).toBe(200);
      expect(status).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledTimes(1);
      expect(json).toHaveBeenCalledWith(userTypeNames);
    });

    test("If the user is not able to modify the site, getUsers will send a 401 error", () => {
      const result = uc.getUserTypes(req, res);

      expect(result).toBe("Access Denied");
      expect(status).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledTimes(1);
      expect(json).toHaveBeenCalledWith({
        error: "Access Denied",
      });
    });
  });

  describe("getUserRequestToken", () => {
    test("getUserRequestToken will insert the authorization data into the request object when proper authorization data is included in the headers, then run the next function", (done) => {
      const auth = "Bearer 123456";
      req.headers = {
        authorization: auth,
      };

      const decoded = {
        user: "abc",
        usertype: "xyz",
      };

      jwt.verify.mockClear();
      jwt.verify.mockImplementationOnce((token, secret, opt, callback) => {
        callback(null, decoded);
      });

      next = jest.fn(() => {});

      uc.getUserRequestToken(req, res, next)
        .then(() => {
          expect(next).toHaveBeenCalledTimes(1);
          expect(req._authData).toMatchObject(decoded);
          expect(jwt.verify).toHaveBeenCalledTimes(1);
          expect(jwt.verify).toHaveBeenCalledWith(auth.split(' ')[1], jwtSecret, { alg: uc.jwtAlg }, expect.any(Function));
          done();
        });
    });

    test("getUserRequestToken will set req._authData to null if jwt.verify returns an error", (done) => {
      const auth = "Bearer 123456";
      req.headers = {
        authorization: auth,
      };

      jwt.verify.mockClear();
      jwt.verify.mockImplementationOnce((token, secret, opt, callback) => {
        callback("error", null);
      });

      next = jest.fn(() => {});

      uc.getUserRequestToken(req, res, next)
        .then(() => {
          expect(next).toHaveBeenCalledTimes(1);
          expect(req._authData).toBe(null);
          expect(jwt.verify).toHaveBeenCalledTimes(1);
          expect(jwt.verify).toHaveBeenCalledWith(auth.split(' ')[1], jwtSecret, { alg: uc.jwtAlg }, expect.any(Function));
          done();
        });
    });

    test("getUserRequestToken will set req._authData to null if the authorization header doesn't have Bearer as the first word with a space", (done) => {
      const auth = "Bear 123456";
      req.headers = {
        authorization: auth,
      };

      jwt.verify.mockClear();

      next = jest.fn(() => {});

      uc.getUserRequestToken(req, res, next)
        .then(() => {
          expect(next).toHaveBeenCalledTimes(1);
          expect(req._authData).toBe(null);
          expect(jwt.verify).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUserRequestToken will set req._authData to null if the authorization header has more than one space", (done) => {
      const auth = "Bearer  123456";
      req.headers = {
        authorization: auth,
      };

      jwt.verify.mockClear();

      next = jest.fn(() => {});

      uc.getUserRequestToken(req, res, next)
        .then(() => {
          expect(next).toHaveBeenCalledTimes(1);
          expect(req._authData).toBe(null);
          expect(jwt.verify).toHaveBeenCalledTimes(0);
          done();
        });
    });

    test("getUserRequestToken will set req._authData to null if there is no authorization header", (done) => {
      req.headers = {};

      jwt.verify.mockClear();

      next = jest.fn(() => {});

      uc.getUserRequestToken(req, res, next)
        .then(() => {
          expect(next).toHaveBeenCalledTimes(1);
          expect(req._authData).toBe(null);
          expect(jwt.verify).toHaveBeenCalledTimes(0);
          done();
        });
    });

  });

  describe("checkAllowedUsersForSiteMod", () => {
    test("checkAllowedUsersForSiteMod will return true if the userType in the authorization token is in the userTypes getter and has the edit permission", () => {
      const authToken = {
        userType: 'admin',
      };

      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(true);

      authToken.userType = 'superAdmin';
      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(true);
    });

    test("checkAllowedUsersForSiteMod will return false if the userType in the authorization token is in the userTypes getter and does not have edit permission", () => {
      const authToken = {
        userType: 'subscriber',
      };

      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(false);

      authToken.userType = 'editor';
      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
    });

    test("checkAllowedUsersForSiteMod will return false if the userType in the authorization token is not in the userTypes getter", () => {
      const authToken = {
        userType: 'flagger',
      };

      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(false);

      authToken.userType = 'snowballer';
      expect(uc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
    });
  });

  describe("checkAllowedUsersForSiteInfo", () => {
    test("checkAllowedUsersForSiteInfo will return true if the userType in the authorization token is in the userTypes getter and has the edit permission", () => {
      const authToken = {
        userType: 'admin',
      };

      expect(uc.checkAllowedUsersForSiteInfo(authToken)).toBe(true);

      authToken.userType = 'superAdmin';
      expect(uc.checkAllowedUsersForSiteInfo(authToken)).toBe(true);
    });

    test("checkAllowedUsersForSiteInfo will return false if the userType in the authorization token is in the userTypes getter and does not have edit permission", () => {
      const authToken = {
        userType: 'subscriber',
      };

      expect(uc.checkAllowedUsersForSiteInfo(authToken)).toBe(false);
    });

    test("checkAllowedUsersForSiteInfo will return false if the userType in the authorization token is not in the userTypes getter", () => {
      const authToken = {
        userType: 'flagger',
      };

      expect(uc.checkAllowedUsersForSiteInfo(authToken)).toBe(false);

      authToken.userType = 'snowballer';
      expect(uc.checkAllowedUsersForSiteInfo(authToken)).toBe(false);
    });
  });

});
