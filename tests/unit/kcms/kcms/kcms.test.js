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

const KCMS = require("../../../../k-cms/kcms");
const makeKCMS = require("../../../../k-cms");

const KCMSPlugin = require("../../../../plugin/index");

const PluginHandler = require("../../../../k-cms/plugin-handler");
const userModule = require("../../../../k-cms/user");
const pageModule = require("../../../../k-cms/page");
const databaseModule = require("../../../../k-cms/database");
const blogModule = require("../../../../k-cms/blog");

const endOnErrorModule = require("../../../../k-cms/utilities/endOnError");

jest.mock("uuid/v4", () => {
  const v4 = jest.fn(() => { return "96"; });
  return v4;
});

jest.mock("../../../../k-cms/utilities/endOnError", () => {
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

jest.mock("../../../../k-cms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

// jest.mock("../../../../k-cms/plugin-handler", () => {
//   // eslint-disable-next-line no-shadow
//   function PluginHandler() {}
//   PluginHandler.prototype.db = () => {};

//   return PluginHandler;
// });

jest.mock("../../../../k-cms/user", () => {
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

jest.mock("../../../../k-cms/blog", () => {
  const makeBlogController = jest.fn(() => {});
  return {
    makeBlogController,
  };
});

jest.mock("../../../../k-cms/page", () => {
  const makePageController = jest.fn(() => {});
  return {
    makePageController,
  };
});

jest.mock("../../../../k-cms/database", () => {
  const makeDatabaseClient = jest.fn(() => {});
  return {
    makeDatabaseClient,
  };
});

const { makeDatabaseClient } = databaseModule;
const { makeUserController, getUserRequestToken } = userModule;
const { makePageController } = pageModule;
const { makeBlogController } = blogModule;
const { endOnError } = endOnErrorModule;

describe("KCMS Class", () => {
  const e = express();
  let cms;

  describe("Constructor", () => {

    beforeEach(() => {
      e.use.mockClear();
      bodyParser.json().mockClear();
      cors().mockClear();
      getUserRequestToken.mockClear();
      endOnError.mockClear();
    });

    test("KCMS Constructor with options containing a database object will create a database client, an express object and run initHandlersAndControllers", () => {
      const db = {};

      makeDatabaseClient.mockImplementationOnce(() => {
        return db;
      });

      // const userRoutes = {};
      // const userController = {
      //   routes: userRoutes,
      //   getUserRequestToken,
      // };
      // makeUserController.mockImplementationOnce(() => {
      //   return userController;
      // });

      // const pageRoutes = {};
      // const pageController = { routes: pageRoutes };
      // makePageController.mockImplementationOnce(() => {
      //   return pageController;
      // });

      const opt = {
        db: {},
      };
      cms = new KCMS(opt);

      // expect(makeDatabaseClient).toHaveBeenCalledTimes(1);
      // expect(makeDatabaseClient).toHaveBeenCalledWith(opt.db);

      // expect(makeUserController).toHaveBeenCalledTimes(1);
      // expect(makeUserController).toHaveBeenCalledWith(db, expect.any(Object));

      // expect(makePageController).toHaveBeenCalledTimes(1);
      // expect(makePageController).toHaveBeenCalledWith(db, expect.any(Object));

      expect(cms.app instanceof EventEmitter).toBe(true);
      expect(cms.db).toBe(db);
      expect(cms.pluginHandler instanceof PluginHandler).toBe(true);

      // expect(e.use).toHaveBeenCalledTimes(3);

      // expect(e.use).toHaveBeenNthCalledWith(1, '/api', jsonFunc, corsFunc, expect.any(Function));
      // expect(e.use).toHaveBeenNthCalledWith(2, '/api/user', userRoutes);
      // expect(e.use).toHaveBeenNthCalledWith(3, '/api/pages', pageRoutes);

      // expect(cms.userController).toBe(userController);
      // expect(cms.pageController).toBe(pageController);

      // expect('/api' in e.useRoutes).toBe(true);
      // expect(e.useRoutes['/api'].length).toBe(3);
      // expect(e.useRoutes['/api'][0]).toBe(jsonFunc);
      // expect(e.useRoutes['/api'][1]).toBe(corsFunc);

      // e.useRoutes['/api'][2]();
      // expect(getUserRequestToken).toHaveBeenCalledTimes(1);

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
    test("KCMS Constructor will use apiBase, user and pages variables if they're passed in the options", () => {
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

      expect(e.use).toHaveBeenNthCalledWith(1, '/testBase', jsonFunc, corsFunc, expect.any(Function));
      expect(e.use).toHaveBeenNthCalledWith(2, '/testBase/userTest', userRoutes);
      expect(e.use).toHaveBeenNthCalledWith(3, '/testBase/pageTest', pageRoutes);
    });

    test("KCMS Constructor will run endOnError if the returned user controller is null", () => {
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
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Error Creating user controller");
    });

    test("KCMS Constructor will run endOnError if the returned user controller is null", () => {
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
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Error Creating page controller");
    });

    test("KCMS will take all valid plugins in the array and add them to the plugin handler which is then added to the cms object", () => {
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

      expect(cms.pluginHandler instanceof PluginHandler).toBe(true);
      expect(cms.pluginHandler.db).toBe(db);
      expect(Array.isArray(cms.pluginHandler.plugins)).toBe(true);
      expect(addPluginsSpy).toHaveBeenCalledTimes(1);
    });

    test("KCMS Constructor will assign a value to blogController if blogEnabled is passed to the KCMS constructor and is true.", () => {
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

      expect(cms.blogController).toBe(blogController);
    });

    test("KCMS Constructor will assign a value to blogController if blogEnabled is passed to the KCMS constructor and is true. If blogPath is provided, it will be used as the route", () => {
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

      expect(cms.blogController).toBe(blogController);

      expect(e.use).toHaveBeenCalledTimes(4);
      expect(e.use).toHaveBeenNthCalledWith(1, '/api', jsonFunc, corsFunc, expect.any(Function));
      expect(e.use).toHaveBeenNthCalledWith(2, '/api/user', userRoutes);
      expect(e.use).toHaveBeenNthCalledWith(3, '/api/pages', pageRoutes);
      expect(e.use).toHaveBeenNthCalledWith(4, '/api/theBlogTest', blogRoutes);
    });

    test("KCMS constructor will not assign a value to blogController if blogEnabled is false", () => {
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

      let undef;
      expect(cms.blogController).toBe(undef);
    });

    test("If makeBlogController doesn't return an object, the blog controller will not be set in KCMS", () => {
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

      let undef;
      expect(cms.blogController).toBe(undef);
      expect(e.use).toHaveBeenCalledTimes(3);
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

    opt = {
      db: {},
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
