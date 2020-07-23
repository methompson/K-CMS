const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { endOnError, isObject } = require("../utilities");

const { checkMongoDbConnection, checkMySQLConnection } = require("../database/checkConnection");
const mongoInit = require("../install/mongodb-init");
const mysqlInit = require("../install/mysql-init");

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

    this.options = options;

    const app = express();
    this.app = app;

    this.router = null;

    this.app.use((req, res, next) => {
      this.router(req, res, next);
    });

    this.db = makeDatabaseClient(options.db);
  }

  checkDbInstallation() {
    let status;
    if (this.db.type === 'mongodb') {
      status = checkMongoDbConnection(this.db, this.options.db.mongodb);
    } else if (this.db.type === "mysql") {
      status = checkMySQLConnection(this.db, this.options.db.mysql.databaseName);
    } else {
      status = Promise.reject();
    }

    return status;
  }

  initHandlersAndControllers() {
    const { options } = this;
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

        const router = express.Router();

        // For all API requests, we will parse the body and make things easier for us
        // We will enable CORS for all requests
        // We will then retrieve the authentication token from the head, if it exists
        // The final function in this route has be used in a short closure because a portion
        // of the data that getUserRequestToken uses is part of the userController object
        // and we need to scope that comes with the implementation below
        router.use(
          `/${apiBase}`,
          bodyParser.json(),
          cors(),
          (req, res, next) => {
            this.userController.getUserRequestToken(req, res, next);
          }
        );

        router.use(`/${apiBase}/${userPath}`, this.userController.routes);
        router.use(`/${apiBase}/${pagePath}`, this.pageController.routes);

        if ('blogEnabled' in options && options.blogEnabled === true) {
          const blogPath = "blogPath" in options ? options.blogPath : 'blog';
          const blogController = makeBlogController(this.db, this.pluginHandler);

          if (blogController) {
            this.blogController = blogController;
            router.use(`/${apiBase}/${blogPath}`, this.blogController.routes);
          }
        }

        this.router = router;
      });
  }

  initUninstalledState() {
    const router = express.Router();

    router.post(
      "/install",
      bodyParser.json(),
      cors(),
      (req, res) => {
        if (!isObject(req.body)
          || !isObject(req.body.adminInfo)
        ) {
          res.status(400).json({
            error: "Required data not provided",
          });
          return;
        }

        if (this.db.type === 'mongodb') {
          mongoInit(this.db, req.body.adminInfo)
            .then(() => {
              console.log("Checking db installation");
              return this.checkDbInstallation();
            })
            .then(() => {
              return this.initHandlersAndControllers();
            })
            .then(() => {
              res.status(200).json({});
            })
            .catch((err) => {
              res.status(400).json({
                error: err,
              });
            });
        }

        if (this.db.type === 'mysql') {
          mysqlInit(this.db, req.body.adminInfo)
            .then((result) => {
              console.log(result);
              return this.checkDbInstallation();
            })
            .then(() => {
              return this.initHandlersAndControllers();
            })
            .then(() => {
              res.status(200).json({});
            })
            .catch((err) => {
              res.status(400).json({
                error: err,
              });
            });
        }
      }
    );

    router.use((req, res) => {
      res.status(503).json({
        error: "The Database is not installed nor configured",
      });
    });

    this.router = router;
    console.log("Uninstalled State");
  }
}

module.exports = KCMS;
