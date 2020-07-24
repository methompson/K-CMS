// We run this mock before anything else so that all modules get the mocked version of EventEmitter
jest.mock("events", () => {
  function EventEmitter() {
    this.useRoutes = {};
  }
  EventEmitter.prototype.use = jest.fn(function use(route, ...args) {
    this.useRoutes[route] = args;
  });

  return {
    EventEmitter,
  };
});

/* eslint-disable no-unused-vars */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const uuidv4 = require("uuid/v4");

const { EventEmitter } = require("events");

const KCMS = require("../../../../kcms/kcms");
const makeKCMS = require("../../../../kcms");

const KCMSPlugin = require("../../../../plugin/index");

const PluginHandler = require("../../../../kcms/plugin-handler");
const userModule = require("../../../../kcms/user");
const pageModule = require("../../../../kcms/page");
const databaseModule = require("../../../../kcms/database");
const blogModule = require("../../../../kcms/blog");

const endOnErrorModule = require("../../../../kcms/utilities/endOnError");
const checkInstallation = require('../../../../kcms/kcms/checkInstallation');
const {
  checkMongoDbConnection,
  checkMySQLConnection,
} = require("../../../../kcms/database/checkConnection");

jest.mock("uuid/v4", () => {
  const v4 = jest.fn(() => { return "96"; });
  return v4;
});

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

jest.mock("body-parser", () => {
  const func = jest.fn(() => {});
  const json = jest.fn(() => {
    return func;
  });
  return {
    json,
  };
});

jest.mock("cors", () => {
  const anotherFunc = jest.fn(() => {});
  const corsFunc = jest.fn(() => {
    return anotherFunc;
  });
  return corsFunc;
});

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

jest.mock("../../../../kcms/user", () => {
  const getUserRequestToken = jest.fn(() => {});
  const makeUserController = jest.fn(() => {
    return {
      getUserRequestToken,
    };
  });
  return {
    makeUserController,
    getUserRequestToken,
  };
});

jest.mock("../../../../kcms/blog", () => {
  const makeBlogController = jest.fn(() => {});
  return {
    makeBlogController,
  };
});

jest.mock("../../../../kcms/page", () => {
  const makePageController = jest.fn(() => {});
  return {
    makePageController,
  };
});

jest.mock("../../../../kcms/database", () => {
  const makeDatabaseClient = jest.fn(() => {});
  return {
    makeDatabaseClient,
  };
});

jest.mock("../../../../kcms/database/checkConnection", () => {
  const checkMongo = jest.fn(async () => {});
  const checkMySQL = jest.fn(async () => {});
  return {
    checkMongoDbConnection: checkMongo,
    checkMySQLConnection: checkMySQL,
  };
});

const mongoInit = require("../../../../kcms/install/mongodb-init");
const mysqlInit = require("../../../../kcms/install/mysql-init");

jest.mock("../../../../kcms/install/mongodb-init", () => {
  return jest.fn(async () => {});
});
jest.mock("../../../../kcms/install/mysql-init", () => {
  return jest.fn(async () => {});
});

const { makeDatabaseClient } = databaseModule;
const { makeUserController, getUserRequestToken } = userModule;
const { makePageController } = pageModule;
const { makeBlogController } = blogModule;
const { endOnError } = endOnErrorModule;

const { RouterClass } = express;

describe("KCMS Class", () => {
  const e = express();
  let cms;
  const routerUse = RouterClass.use;
  const routerPost = RouterClass.post;

  const json = jest.fn(() => {});
  const status = jest.fn(() => {
    return { json };
  });
  const res = { status };

  beforeEach(() => {
    json.mockClear();
    status.mockClear();
    routerUse.mockClear();
    routerPost.mockClear();
    e.use.mockClear();
    bodyParser.json().mockClear();
    cors().mockClear();
    getUserRequestToken.mockClear();
    endOnError.mockClear();
  });

  describe("Constructor", () => {

    test("KCMS Constructor with options containing a database object will create a database client, an express object and run initHandlersAndControllers", () => {
      const db = {};
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const app = express();
      const useSpy = jest.spyOn(app, "use");
      useSpy.mockClear();

      const opt = {
        db: {},
      };
      cms = new KCMS(opt);

      expect(cms.app instanceof EventEmitter).toBe(true);
      expect(cms.db).toBe(db);

      expect(useSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledWith(expect.any(Function));

      expect(cms.router).toBe(null);

      const useAnonymousFunction = useSpy.mock.calls[0][0];
      useAnonymousFunction({}, res, {});
      expect(status).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledTimes(1);
      expect(json).toHaveBeenCalledWith({
        error: "Server not Properly Initialized",
      });

      // const routerSpy = jest.spyOn(cms, "router")
      //   .mockImplementationOnce(() => {});

      // expect(routerSpy).toHaveBeenCalledTimes(0);

      // const useAnonymousFunction = useSpy[0][0];

      // const req = { request: "" };
      // const res = { response: "" };
      // const next = { next: "" };
      // useAnonymousFunction(req, res, next);
      // expect(routerSpy).toHaveBeenCalledTimes(0);
      // expect(routerSpy).toHaveBeenCalledWith(req, res, next);
    });

    test("KCMS Constructor will run endOnError if no options object is sent", () => {
      cms = new KCMS();
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");
    });

    test("KCMS Constructor will run endOnError if non-objects are sent as the options argument", () => {
      cms = new KCMS(69);
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");

      endOnError.mockClear();
      cms = new KCMS("69");
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");

      endOnError.mockClear();
      cms = new KCMS([]);
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");

      endOnError.mockClear();
      cms = new KCMS(null);
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");

      endOnError.mockClear();
      cms = new KCMS(() => {});
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Options Must Be an Object");
    });

    test("KCMS Constructor will run endOnError if the options object doesn't contain a db key", () => {
      cms = new KCMS({});
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Database options not provided");
    });

  });

  describe("initHandlersAndControllers", () => {
    beforeEach(() => {
      makeUserController.mockClear();
      makePageController.mockClear();
      makeDatabaseClient.mockClear();
    });

    test("initHandlersAndControllers will create a pluginHandler, userController, pageController and set several routes.", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const db = {};
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const opt = {
        db: {},
      };
      cms = new KCMS(opt);

      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(makeDatabaseClient).toHaveBeenCalledTimes(1);
          expect(makeDatabaseClient).toHaveBeenCalledWith(opt.db);

          expect(makeUserController).toHaveBeenCalledTimes(1);
          expect(makeUserController).toHaveBeenCalledWith(db, expect.any(Object));

          expect(makePageController).toHaveBeenCalledTimes(1);
          expect(makePageController).toHaveBeenCalledWith(db, expect.any(Object));

          expect(cms.pluginHandler instanceof PluginHandler).toBe(true);

          expect(routerUse).toHaveBeenCalledTimes(3);

          expect(routerUse).toHaveBeenNthCalledWith(1, '/api', jsonFunc, corsFunc, expect.any(Function));
          expect(routerUse).toHaveBeenNthCalledWith(2, '/api/user', userRoutes);
          expect(routerUse).toHaveBeenNthCalledWith(3, '/api/pages', pageRoutes);

          const anonymousUseFunction = routerUse.mock.calls[0][3];
          const req = { request: {} };
          const next = () => {};
          anonymousUseFunction(req, res, next);
          expect(getUserRequestToken).toHaveBeenCalledTimes(1);
          expect(getUserRequestToken).toHaveBeenCalledWith(req, res, next);

          expect(cms.userController).toBe(userController);
          expect(cms.pageController).toBe(pageController);

          done();
        });
    });

    test("initHandlersAndControllers will use apiBase, user and pages variables if they're passed in the options", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = { routes: userRoutes };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const opt = {
        apiBase: "testBase",
        userPath: "userTest",
        pagePath: "pageTest",
        db: {},
      };
      cms = new KCMS(opt);

      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(routerUse).toHaveBeenNthCalledWith(1, '/testBase', jsonFunc, corsFunc, expect.any(Function));
          expect(routerUse).toHaveBeenNthCalledWith(2, '/testBase/userTest', userRoutes);
          expect(routerUse).toHaveBeenNthCalledWith(3, '/testBase/pageTest', pageRoutes);
          done();
        });
    });

    test("initHandlersAndControllers will run endOnError if the returned user controller is null", (done) => {
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      makeUserController.mockImplementationOnce(() => {
        return null;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const opt = {
        db: {},
      };
      cms = new KCMS(opt);

      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(endOnError).toHaveBeenCalledTimes(1);
          expect(endOnError).toHaveBeenCalledWith("Error Creating user controller");

          done();
        });
    });

    test("initHandlersAndControllers will run endOnError if the returned user controller is null", (done) => {
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = { routes: userRoutes };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      makePageController.mockImplementationOnce(() => {
        return null;
      });

      const opt = {
        db: {},
      };
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(endOnError).toHaveBeenCalledTimes(1);
          expect(endOnError).toHaveBeenCalledWith("Error Creating page controller");
          done();
        });
    });

    test("KCMS will take all valid plugins in the array and add them to the plugin handler which is then added to the cms object", (done) => {
      const db = {};
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const opt = {
        db: {},
      };

      const plugin0 = new KCMSPlugin({
        about: {},
        enabled: true,
        config: [],
      });
      const plugin1 = new KCMSPlugin({
        about: {},
        enabled: true,
        config: [],
      });

      const addPluginsSpy = jest.spyOn(PluginHandler.prototype, "addPlugins");

      opt.plugins = [plugin0, plugin1];
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(cms.pluginHandler instanceof PluginHandler).toBe(true);
          expect(cms.pluginHandler.db).toBe(db);
          expect(Array.isArray(cms.pluginHandler.plugins)).toBe(true);
          expect(addPluginsSpy).toHaveBeenCalledTimes(1);

          done();
        });
    });

    test("initHandlersAndControllers will assign a value to blogController if blogEnabled is passed to initHandlersAndControllers and is true.", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const blogRoutes = {};
      const blogController = { routes: blogRoutes };
      makeBlogController.mockImplementationOnce(() => {
        return blogController;
      });

      const opt = {
        db: {},
        blogEnabled: true,
      };
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(cms.blogController).toBe(blogController);
          done();
        });
    });

    test("initHandlersAndControllers will assign a value to blogController if blogEnabled is passed to the initHandlersAndControllers and is true. If blogPath is provided, it will be used as the route", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const blogRoutes = {};
      const blogController = { routes: blogRoutes };
      makeBlogController.mockImplementationOnce(() => {
        return blogController;
      });

      const opt = {
        db: {},
        blogEnabled: true,
        blogPath: "theBlogTest",
      };
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          expect(cms.blogController).toBe(blogController);

          expect(routerUse).toHaveBeenCalledTimes(4);
          expect(routerUse).toHaveBeenNthCalledWith(1, '/api', jsonFunc, corsFunc, expect.any(Function));
          expect(routerUse).toHaveBeenNthCalledWith(2, '/api/user', userRoutes);
          expect(routerUse).toHaveBeenNthCalledWith(3, '/api/pages', pageRoutes);
          expect(routerUse).toHaveBeenNthCalledWith(4, '/api/theBlogTest', blogRoutes);

          done();
        });
    });

    test("initHandlersAndControllers will not assign a value to blogController if blogEnabled is false", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      const opt = {
        db: {},
        blogEnabled: false,
      };
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          let undef;
          expect(cms.blogController).toBe(undef);
          done();
        });
    });

    test("If makeBlogController doesn't return an object, the blog controller will not be set in KCMS", (done) => {
      const jsonFunc = bodyParser.json();
      const corsFunc = cors();
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      const userRoutes = {};
      const userController = {
        routes: userRoutes,
        getUserRequestToken,
      };
      makeUserController.mockImplementationOnce(() => {
        return userController;
      });

      const pageRoutes = {};
      const pageController = { routes: pageRoutes };
      makePageController.mockImplementationOnce(() => {
        return pageController;
      });

      makeBlogController.mockImplementationOnce(() => {
        return null;
      });

      const opt = {
        db: {},
        blogEnabled: true,
        blogPath: "theBlogTest",
      };
      cms = new KCMS(opt);
      cms.initHandlersAndControllers(opt)
        .then(() => {
          let undef;
          expect(cms.blogController).toBe(undef);
          expect(routerUse).toHaveBeenCalledTimes(3);

          done();
        });
    });
  });

  describe("checkDbInstallation", () => {
    let opt;
    const dbName = "kcmsTest";

    beforeEach(() => {
      checkMongoDbConnection.mockClear();
      checkMySQLConnection.mockClear();
    });

    function makeCMS(type) {
      const db = {
        type,
      };
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      opt = {
        db: {},
      };

      opt.db[type] = {
        databaseName: dbName,
      };
      return new KCMS(opt);
    }

    test("When the database type is mongodb, checkDbInstallation will run checkMongoDbConnection and return the status from that function", (done) => {
      cms = makeCMS('mongodb');

      checkMongoDbConnection.mockImplementationOnce(() => {
        return Promise.resolve();
      });

      cms.checkDbInstallation()
        .then(() => {
          expect(checkMongoDbConnection).toHaveBeenCalledTimes(1);
          expect(checkMongoDbConnection).toHaveBeenCalledWith(cms.db, cms.options.db.mongodb.databaseName);
          done();
        });
    });

    test("When the database type is mongodb, checkDbInstallation will run checkMongoDbConnection and return the status from that function, even when the status rejects", (done) => {
      cms = makeCMS('mongodb');

      checkMongoDbConnection.mockImplementationOnce(() => {
        return Promise.reject();
      });

      cms.checkDbInstallation()
        .catch(() => {
          expect(checkMongoDbConnection).toHaveBeenCalledTimes(1);
          expect(checkMongoDbConnection).toHaveBeenCalledWith(cms.db, cms.options.db.mongodb.databaseName);
          done();
        });
    });

    test("When the database type is mysql, checkDbInstallation will run checkMySQLConnection and return the status from that function", (done) => {
      cms = makeCMS('mysql');

      checkMySQLConnection.mockImplementationOnce(() => {
        return Promise.resolve();
      });

      cms.checkDbInstallation()
        .then(() => {
          expect(checkMySQLConnection).toHaveBeenCalledTimes(1);
          expect(checkMySQLConnection).toHaveBeenCalledWith(cms.db, cms.options.db.mysql.databaseName);
          done();
        });
    });

    test("When the database type is mysql, checkDbInstallation will run checkMySQLConnection and return the status from that function, even when the status rejects", (done) => {
      cms = makeCMS('mysql');

      checkMySQLConnection.mockImplementationOnce(() => {
        return Promise.reject();
      });

      cms.checkDbInstallation()
        .catch(() => {
          expect(checkMySQLConnection).toHaveBeenCalledTimes(1);
          expect(checkMySQLConnection).toHaveBeenCalledWith(cms.db, cms.options.db.mysql.databaseName);
          done();
        });
    });

    test("If the database type is neither mysql nor mongodb, checkDbInstallation will always throw an error", (done) => {
      // We'll use several databases that we might support in the future
      const cms1 = makeCMS('postgres');
      const cms2 = makeCMS('dynamodb');
      const cms3 = makeCMS('redis');
      const cms4 = makeCMS('sqlite');
      const cms5 = makeCMS('cassandra');
      const cms6 = makeCMS('mariadb');

      const p1 = cms1.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached
      const p2 = cms2.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached
      const p3 = cms3.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached
      const p4 = cms4.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached
      const p5 = cms5.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached
      const p6 = cms6.checkDbInstallation()
        .then(() => { expect(true).toBe(false); done(); }) // This should not be reached
        .catch(() => { expect(true).toBe(true); }); // This will be reached

      Promise.all([p1, p2, p3, p4, p5, p6])
        .then(() => {
          // p1 through p6 should all fail, meaning that we should reach this point after all of the catch statements
          done();
        });

    });
  });

  describe("initUninstalledState", () => {
    let opt;
    const dbName = "kcmsTest";

    function makeCMS(type) {
      const db = {
        type,
      };
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      opt = {
        db: {},
      };

      opt.db[type] = {
        databaseName: dbName,
      };
      return new KCMS(opt);
    }

    test("initUninstalledState will create a router and add 1 post route and 1 use route then assign said router to this.router. The anonymous functions will either call methods in the class or send a response", () => {
      const useSpy = jest.spyOn(express(), "use");
      useSpy.mockClear();

      cms = makeCMS('mysql');
      cms.initUninstalledState();

      expect(routerUse).toHaveBeenCalledTimes(1);
      expect(routerUse).toHaveBeenCalledWith(expect.any(Function));
      expect(routerPost).toHaveBeenCalledTimes(1);
      expect(routerPost).toHaveBeenCalledWith(
        "/install",
        bodyParser.json(),
        cors(),
        expect.any(Function)
      );

      const routerSpy = jest.spyOn(cms, "router");

      const appUseAnonymousFunction = useSpy.mock.calls[0][0];
      const req = { request: "" };
      const next = { next: "" };
      appUseAnonymousFunction(req, res, next);

      expect(routerSpy).toHaveBeenCalledTimes(1);
      expect(routerSpy).toHaveBeenCalledWith(req, res, next);

      const postAnonymousFunction = routerPost.mock.calls[0][3];
      const initDbSpy = jest.spyOn(cms, "initDatabases")
        .mockImplementationOnce(() => {});

      postAnonymousFunction();
      expect(initDbSpy).toHaveBeenCalledTimes(1);

      const useAnonymousFunction = routerUse.mock.calls[0][0];

      useAnonymousFunction({}, res);
      expect(status).toHaveBeenCalledTimes(1);
      expect(status).toHaveBeenCalledWith(503);
      expect(json).toHaveBeenCalledTimes(1);
      expect(json).toHaveBeenCalledWith({
        error: "The Database is not installed nor configured",
      });
    });
  });

  describe("initDatabases", () => {
    let opt;
    const dbName = "kcmsTest";

    beforeEach(() => {
      mongoInit.mockClear();
      mysqlInit.mockClear();
    });

    function makeCMS(type) {
      const db = {
        type,
      };
      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      opt = {
        db: {},
      };

      opt.db[type] = {
        databaseName: dbName,
      };
      return new KCMS(opt);
    }

    test("If the request doesn't have a body, initDatabases will throw an error and return a 400 status", (done) => {
      cms = makeCMS("mongodb");
      const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
        .mockImplementationOnce(async () => {});
      const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
        .mockImplementationOnce(async () => {});

      const req = {};

      const error = "Required data not provided";

      cms.initDatabases(req, res)
        .catch((result) => {
          expect(result).toBe(error);
          expect(mongoInit).toHaveBeenCalledTimes(0);
          expect(mysqlInit).toHaveBeenCalledTimes(0);
          expect(checkDbSpy).toHaveBeenCalledTimes(0);
          expect(initSpy).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });
          done();
        });
    });

    test("If the request has a body, but no adminInfo initDatabases will throw an error and return a 400 status", (done) => {
      cms = makeCMS("mongodb");
      const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
        .mockImplementationOnce(async () => {});
      const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
        .mockImplementationOnce(async () => {});

      const req = {
        body: {},
      };

      const error = "Required data not provided";

      cms.initDatabases(req, res)
        .catch((result) => {
          expect(result).toBe(error);
          expect(mongoInit).toHaveBeenCalledTimes(0);
          expect(mysqlInit).toHaveBeenCalledTimes(0);
          expect(checkDbSpy).toHaveBeenCalledTimes(0);
          expect(initSpy).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });
          done();
        });
    });

    test("If the request has a body & adminInfo, but the database type is not supported, the function will throw an error and send a 400 status", (done) => {
      cms = makeCMS("postgres");
      const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
        .mockImplementationOnce(async () => {});
      const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
        .mockImplementationOnce(async () => {});

      const req = {
        body: {
          adminInfo: {},
        },
      };

      const error = "Database Type Not Supported";

      cms.initDatabases(req, res)
        .catch((err) => {
          expect(err).toBe(error);
          expect(mongoInit).toHaveBeenCalledTimes(0);
          expect(mysqlInit).toHaveBeenCalledTimes(0);
          expect(checkDbSpy).toHaveBeenCalledTimes(0);
          expect(initSpy).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });
          done();
        });
    });

    describe("mongodb", () => {
      test("Success will run mongoInit, checkDbInstallation and initHandlersAndControllers, then send a 200 status", (done) => {
        cms = makeCMS("mongodb");
        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(200);
            expect(mongoInit).toHaveBeenCalledTimes(1);
            expect(mongoInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({});
            done();
          });
      });

      test("If mongoInit throws an error, checkDbInstallation won't run and initHandlersAndControllers won't run. A 400 error will be thrown.", (done) => {
        cms = makeCMS("mongodb");
        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const error = "test error";
        mongoInit.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mongoInit).toHaveBeenCalledTimes(1);
            expect(mongoInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(0);
            expect(initSpy).toHaveBeenCalledTimes(0);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error,
            });
            done();
          });
      });

      test("If checkDbInstallation throws an error, initHandlersAndControllers won't run. A 400 error will be thrown.", (done) => {
        cms = makeCMS("mongodb");
        const error = "test error";

        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {
            throw error;
          });
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mongoInit).toHaveBeenCalledTimes(1);
            expect(mongoInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(0);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error,
            });
            done();
          });
      });

      test("If initHandlersAndControllers throws an error, a 400 error will be thrown.", (done) => {
        cms = makeCMS("mongodb");
        const error = "test error";

        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {
            throw error;
          });

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mongoInit).toHaveBeenCalledTimes(1);
            expect(mongoInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(1);
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

    describe("mysql", () => {
      test("Success will run mysqlInit, checkDbInstallation and initHandlersAndControllers, then send a 200 status", (done) => {
        cms = makeCMS("mysql");
        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(200);
            expect(mysqlInit).toHaveBeenCalledTimes(1);
            expect(mysqlInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({});
            done();
          });
      });

      test("If mysqlInit throws an error, checkDbInstallation won't run and initHandlersAndControllers won't run. A 400 error will be thrown.", (done) => {
        cms = makeCMS("mysql");
        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const error = "test error";
        mysqlInit.mockImplementationOnce(() => {
          return Promise.reject(error);
        });

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mysqlInit).toHaveBeenCalledTimes(1);
            expect(mysqlInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(0);
            expect(initSpy).toHaveBeenCalledTimes(0);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error,
            });
            done();
          });
      });

      test("If checkDbInstallation throws an error, initHandlersAndControllers won't run. A 400 error will be thrown.", (done) => {
        cms = makeCMS("mysql");
        const error = "test error";

        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {
            throw error;
          });
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {});

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mysqlInit).toHaveBeenCalledTimes(1);
            expect(mysqlInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(0);
            expect(status).toHaveBeenCalledTimes(1);
            expect(status).toHaveBeenCalledWith(400);
            expect(json).toHaveBeenCalledTimes(1);
            expect(json).toHaveBeenCalledWith({
              error,
            });
            done();
          });
      });

      test("If initHandlersAndControllers throws an error, a 400 error will be thrown.", (done) => {
        cms = makeCMS("mysql");
        const error = "test error";

        const checkDbSpy = jest.spyOn(cms, "checkDbInstallation")
          .mockImplementationOnce(async () => {});
        const initSpy = jest.spyOn(cms, "initHandlersAndControllers")
          .mockImplementationOnce(async () => {
            throw error;
          });

        const req = {
          body: {
            adminInfo: {},
          },
        };

        cms.initDatabases(req, res)
          .then((result) => {
            expect(result).toBe(error);
            expect(mysqlInit).toHaveBeenCalledTimes(1);
            expect(mysqlInit).toHaveBeenCalledWith(cms.db, req.body.adminInfo);
            expect(checkDbSpy).toHaveBeenCalledTimes(1);
            expect(initSpy).toHaveBeenCalledTimes(1);
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
  });

});

describe("checkInstallation", () => {
  test("If checkDbInstallation resolves, initHandlersAndControllers will be run and initUninstalledState will not be run", (done) => {
    const db = {};
    makeDatabaseClient.mockImplementationOnce(() => {
      return db;
    });

    const opt = {
      db: {},
    };
    const cms = new KCMS(opt);

    jest.spyOn(cms, "checkDbInstallation")
      .mockImplementationOnce(() => {
        return Promise.resolve();
      });

    const initHandlerSpy = jest.spyOn(cms, "initHandlersAndControllers");
    const initUninstalledSpy = jest.spyOn(cms, "initUninstalledState");

    checkInstallation(cms)
      .then(() => {
        expect(initHandlerSpy).toHaveBeenCalledTimes(1);
        expect(initUninstalledSpy).toHaveBeenCalledTimes(0);
        done();
      });
  });

  test("If checkDbInstallation rejects, initUninstalledState will be run and initHandlersAndControllers will not be run", (done) => {
    const db = {};
    makeDatabaseClient.mockImplementationOnce(() => {
      return db;
    });

    const opt = {
      db: {},
    };
    const cms = new KCMS(opt);

    jest.spyOn(cms, "checkDbInstallation")
      .mockImplementationOnce(() => {
        return Promise.reject();
      });

    const initHandlerSpy = jest.spyOn(cms, "initHandlersAndControllers");
    const initUninstalledSpy = jest.spyOn(cms, "initUninstalledState");

    checkInstallation(cms)
      .then(() => {
        expect(initHandlerSpy).toHaveBeenCalledTimes(0);
        expect(initUninstalledSpy).toHaveBeenCalledTimes(1);
        done();
      });
  });
});

describe("makeKCMS", () => {
  const db = {};
  let opt;

  beforeEach(() => {

    makeDatabaseClient.mockImplementationOnce(() => {
      return db;
    });

    const userRoutes = {};
    const userController = {
      routes: userRoutes,
      getUserRequestToken,
    };
    makeUserController.mockImplementationOnce(() => {
      return userController;
    });

    const pageRoutes = {};
    const pageController = { routes: pageRoutes };
    makePageController.mockImplementationOnce(() => {
      return pageController;
    });

    const checkSpy = jest.spyOn(KCMS.prototype, "checkDbInstallation")
      .mockImplementationOnce(() => {
        return Promise.resolve();
      });

    opt = {
      db: {
        mongodb: {},
      },
    };
  });

  test("makeKCMS will create a KCMS object when called with options and return that value. The jwtSecret will be set by uuidv4", () => {
    const secret = "69";
    uuidv4.mockImplementationOnce(() => {
      return secret;
    });
    const cms = makeKCMS(opt);

    expect(cms instanceof KCMS).toBe(true);
    expect(global.jwtSecret).toBe(secret);
  });

  test("makeKCMS will create a KCMS object when called with options and return that value. The jwtSecret will be set by options parameter", () => {
    const secret = "6969";
    opt.jwtSecret = secret;
    const cms = makeKCMS(opt);

    expect(cms instanceof KCMS).toBe(true);
    expect(global.jwtSecret).toBe(secret);
  });

  test("makeKCMS will create a KCMS object when called with options and return that value. The jwtSecret will be set by the process.env variable", () => {
    const secret = "696969";
    process.env.JWT_SECRET = secret;
    const cms = makeKCMS(opt);

    expect(cms instanceof KCMS).toBe(true);
    expect(global.jwtSecret).toBe(secret);
  });
});
