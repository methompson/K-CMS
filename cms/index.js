const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const utils = require("../utilities");

const { makeAuthController } = require('../auth');
const { makePageController } = require('../page');
const { makeDatabaseClient } = require('../database');

// We use this to instantiate an Authenticator object with default values.
// If a user passes their own routes and controller, the app would use that
// rather than these defaults
// const authRoutes = require('../routes/auth');
// const authController = require('../controllers/auth');

class CMS {
  constructor(options = {}) {
    if (typeof options !== typeof {}) {
      utils.endOnError("Options Must Be an Object");
    }

    // This plugin array should be a pointer, so any changes should be visible throughout
    // in any of the controllers.
    if ('plugins' in options && Array.isArray(options.plugins)) {
      this.plugins = options.plugins;
    }

    if (!('db' in options)) {
      utils.endOnError("Database options not provided");
    }

    this.db = makeDatabaseClient(options.db);

    // console.log("Db Created", this.db);

    const app = express();

    app.use('/', (req, res, next) => {
      req.$cms = this;
      console.log("Always Here");
      next();
    });

    this.authController = makeAuthController(this.db, this.plugins);
    this.pageController = makePageController(this.authController, this.db, this.plugins);

    const apiBase = "apiBase" in options ? options.apiBase : 'api';
    const authPath = "auth" in options ? options.authPath : 'auth';
    const pagePath = "pages" in options ? options.pagePath : 'pages';

    app.use(`/${apiBase}/${authPath}`, bodyParser.json(), cors(), this.authController.routes);
    app.use(`/${apiBase}/${pagePath}`, bodyParser.json(), cors(), this.pageController.routes);

    this.app = app;
  }

  // Check that each plugin is proper. Remove those that aren't
  checkPlugins() {}
}

module.exports = CMS;
