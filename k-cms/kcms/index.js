const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { endOnError, isObject } = require("../utilities");

// const { makeAuthController } = require('../auth');
const { makeUserController } = require('../user');
const { makePageController } = require('../page');
const { makeDatabaseClient } = require('../database');

const PluginHandler = require('../plugin-handler');

class KCMS {
  constructor(options = {}) {
    if (!isObject(options)) {
      endOnError("Options Must Be an Object");
    }

    if (!('db' in options)) {
      endOnError("Database options not provided");
    }

    this.db = makeDatabaseClient(options.db);

    if ('plugins' in options) {
      this.checkPlugins(options.plugins);
    }

    const app = express();

    this.userController = makeUserController(this.db, this.pluginHandler);
    this.pageController = makePageController(this.db, this.pluginHandler);

    if (!this.userController) {
      endOnError("Error Creating user controller");
    }
    if (!this.pageController) {
      endOnError("Error Creating user controller");
    }

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

module.exports = KCMS;
