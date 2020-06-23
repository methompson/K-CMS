const express = require("express");
const jwt = require("jsonwebtoken");
const http = require("http");

const UserController = require("../../../../k-cms/user/UserController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

const utilities = require("../../../../k-cms/utilities");

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

  beforeEach(() => {
    ph = new PluginHandler();
    uc = new UserController(ph);

    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();

    json.mockClear();
    status.mockClear();

    req = {};
    res = new http.ServerResponse();
  });

  describe("Instantiation", () => {
    test("When a UserController is created, several parameters are saved in the constructor and several routes are added", () => {
      uc = new UserController(ph);
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
    let routes;
    beforeEach(() => {
      routes = uc.routes.getRoutes();
    });

    test("The Router mock will save all of the data that was added in the constructor ", () => {
      expect(Object.keys(routes.post).length).toBe(4);
      expect(Object.keys(routes.get).length).toBe(3);

      expect('/login' in routes.post).toBe(true);
      expect('/add-user' in routes.post).toBe(true);
      expect('/edit-user' in routes.post).toBe(true);
      expect('/delete-user' in routes.post).toBe(true);

      expect('/get-user/:id' in routes.get).toBe(true);
      expect('/all-users/:page*?' in routes.get).toBe(true);
      expect('/get-user-types' in routes.get).toBe(true);
    });

    test("the /login route has one function.", () => {
      const authSpy = jest.spyOn(uc, 'authenticateUserCredentials');

      const route = routes.post['/login'];

      route[0]();
      expect(authSpy).toHaveBeenCalledTimes(1);
    });

    test("the /add-user route has two functions. The second function runs addUser", () => {
      const addUserSpy = jest.spyOn(uc, 'addUser');

      const route = routes.post['/add-user'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(addUserSpy).toHaveBeenCalledTimes(1);
    });

    test("the /edit-user route has two functions. The second function runs editUser", () => {
      const editUserSpy = jest.spyOn(uc, 'editUser');

      const route = routes.post['/edit-user'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(editUserSpy).toHaveBeenCalledTimes(1);
    });

    test("the /delete-user route has two functions. The second function runs deleteUser", () => {
      const delUserSpy = jest.spyOn(uc, 'deleteUser');

      const route = routes.post['/delete-user'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(delUserSpy).toHaveBeenCalledTimes(1);
    });

    test("the /get-user/:id route has two functions. The second function runs getUser", () => {
      const getUserSpy = jest.spyOn(uc, 'getUser');

      const route = routes.get['/get-user/:id'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(getUserSpy).toHaveBeenCalledTimes(1);
    });

    test("the /all-users/:page*? route has two functions. The second function runs getAllUsers", () => {
      const getUserSpy = jest.spyOn(uc, 'getAllUsers');

      const route = routes.get['/all-users/:page*?'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(getUserSpy).toHaveBeenCalledTimes(1);
    });

    test("the /all-user-types route has two functions. The second function runs getUserTypes", () => {
      const getUserSpy = jest.spyOn(uc, 'getUserTypes');

      const route = routes.get['/get-user-types'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1](req, res);
      expect(getUserSpy).toHaveBeenCalledTimes(1);
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

      const next = jest.fn(() => {});

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

      const next = jest.fn(() => {});

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

      const next = jest.fn(() => {});

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

      const next = jest.fn(() => {});

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

      const next = jest.fn(() => {});

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
