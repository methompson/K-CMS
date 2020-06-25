const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { endOnError, isObject } = require("../utilities");

const { makeDatabaseClient } = require('../database');
const { makeUserController } = require('../user');
const { makePageController } = require('../page');
const { makeBlogController } = require('../blog');

const PluginHandler = require('../plugin-handler');

class KCMS {
  constructor(options) {
    if (!isObject(options)) {
      endOnError("Options Must Be an Object");
      return;
    }

    if (!('db' in options)) {
      endOnError("Database options not provided");
      return;
    }

    const app = express();
    this.app = app;

    this.db = makeDatabaseClient(options.db);
  }

  initHandlersAndControllers(options) {
    this.pluginHandler = new PluginHandler(this.db);
    return this.pluginHandler.addPlugins(options.plugins)
      .then(() => {
        this.userController = makeUserController(this.db, this.pluginHandler);
        this.pageController = makePageController(this.db, this.pluginHandler);

        if (!this.userController) {
          endOnError("Error Creating user controller");
          return;
        }
        if (!this.pageController) {
          endOnError("Error Creating page controller");
          return;
        }

        const apiBase = "apiBase" in options ? options.apiBase : 'api';
        const userPath = "userPath" in options ? options.userPath : 'user';
        const pagePath = "pagePath" in options ? options.pagePath : 'pages';

        // For all API requests, we will parse the body and make things easier for us
        // We will enable CORS for all requests
        // We will then retrieve the authentication token from the head, if it exists
        // The final function in this route has be used in a short closure because a portion
        // of the data that getUserRequestToken uses is part of the userController object
        // and we need to scope that comes with the implementation below
        this.app.use(
          `/${apiBase}`,
          bodyParser.json(),
          cors(),
          (req, res, next) => {
            this.userController.getUserRequestToken(req, res, next);
          }
        );

        this.app.use(`/${apiBase}/${userPath}`, this.userController.routes);
        this.app.use(`/${apiBase}/${pagePath}`, this.pageController.routes);

        if ('blogEnabled' in options && options.blogEnabled === true) {
          const blogPath = "blogPath" in options ? options.blogPath : 'blog';
          const blogController = makeBlogController(this.db, this.pluginHandler);

          if (blogController) {
            this.blogController = blogController;
            this.app.use(`/${apiBase}/${blogPath}`, this.blogController.routes);
          }
        }
      });
  }
}

module.exports = KCMS;
