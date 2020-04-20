const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { endOnError } = require("../utilities");

// const { makeAuthController } = require('../auth');
const { makeUserController } = require('../user');
const { makePageController } = require('../page');
const { makeDatabaseClient } = require('../database');

const PluginHandler = require('../plugin-handler');

// We use this to instantiate an Authenticator object with default values.
// If a user passes their own routes and controller, the app would use that
// rather than these defaults
// const authRoutes = require('../routes/auth');
// const authController = require('../controllers/auth');

class CMS {
  constructor(options = {}) {
    if (typeof options !== typeof {}) {
      endOnError("Options Must Be an Object");
    }

    if (!('db' in options)) {
      endOnError("Database options not provided");
    }

    this.db = makeDatabaseClient(options.db);

    if ('plugins' in options) {
      this.checkPlugins(options.plugins);
    }

    // console.log("Db Created", this.db);

    const app = express();

    app.use('/', (req, res, next) => {
      req.$cms = this;
      console.log("Always Here");
      next();
    });

    this.userController = makeUserController(this.db, this.pluginHandler);
    this.pageController = makePageController(this.userController, this.db, this.pluginHandler);

    const apiBase = "apiBase" in options ? options.apiBase : 'api';
    const userPath = "user" in options ? options.userPath : 'user';
    const pagePath = "pages" in options ? options.pagePath : 'pages';

    // For all API requests, we will parse the body and make things easier for us
    // We will enable CORS for all requests
    // We will then retrieve the authentication token from the head, if it exists
    app.use(
      `/${apiBase}`,
      bodyParser.json(),
      cors(),
      (req, res, next) => {
        this.userController.getUserRequestToken(req, res, next);
      }
    );

    app.use(`/${apiBase}/${userPath}`, this.userController.routes);
    app.use(`/${apiBase}/${pagePath}`, this.pageController.routes);

    this.app = app;
  }

  // Check that each plugin is proper. Remove those that aren't
  checkPlugins(plugins = []) {
    // All plugins are sent to the CMS in an array.
    if (!plugins || !Array.isArray(plugins)) {
      this.pluginHandler = new PluginHandler();
      return;
    }

    this.pluginHandler = new PluginHandler(this.db, plugins);
  }
}

module.exports = CMS;
