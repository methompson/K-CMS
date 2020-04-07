const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const { endOnError } = require("../utilities");

// const { makeAuthController } = require('../auth');
const { makeUserController } = require('../user');
const { makePageController } = require('../page');
const { makeDatabaseClient } = require('../database');

const KCMSPlugin = require('../plugin');

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

    // This plugin array should be a pointer, so any changes should be visible throughout
    // in any of the controllers.
    if ('plugins' in options) {
      this.checkPlugins(options.plugins);
    }

    if (!('db' in options)) {
      endOnError("Database options not provided");
    }

    this.db = makeDatabaseClient(options.db);

    // console.log("Db Created", this.db);

    const app = express();

    app.use('/', (req, res, next) => {
      req.$cms = this;
      console.log("Always Here");
      next();
    });

    console.log("making controllers. Plugins: ", this.plugins);

    this.userController = makeUserController(this.db, this.plugins);
    this.pageController = makePageController(this.userController, this.db, this.plugins);

    const apiBase = "apiBase" in options ? options.apiBase : 'api';
    const userPath = "user" in options ? options.userPath : 'user';
    const pagePath = "pages" in options ? options.pagePath : 'pages';

    app.use(`/${apiBase}`, bodyParser.json(), cors(), this.userController.authorizeUser);
    app.use(`/${apiBase}/${userPath}`, this.userController.routes);
    app.use(`/${apiBase}/${pagePath}`, this.pageController.routes);

    this.app = app;
  }

  // Check that each plugin is proper. Remove those that aren't
  checkPlugins(plugins = []) {
    const actions = {};
    // All plugins are sent to the CMS in an array.
    if (!plugins || !Array.isArray(plugins)) {
      this.plugins = actions;
      return;
    }

    // Cycle through all of the plugins.
    for (let x = 0, len = plugins.length; x < len; ++x) {
      console.log(len);
      // If it's an actual Plugin, we'll go further.
      if (plugins[x] instanceof KCMSPlugin) {
        // Get all of the hooks, put them into an organized object.
        const plugin = plugins[x];
        const hooks = Object.keys(plugin.hooks);

        console.log(plugin, hooks, plugin.hooks);

        // Cycle through this plugin's hooks
        for (let y = 0, hlen = hooks.length; y < hlen; ++y) {
          const hook = hooks[y];
          const lifeCycleActions = plugin.hooks[hook];


          // If the lifecycle hook doesn't exist in the eventual hooks colection, we'll make it
          if (!(hook in actions)) {
            actions[hook] = [];
          }

          actions[hook] = [
            ...actions[hook],
            ...lifeCycleActions,
          ];
        }
      }
    }

    this.plugins = actions;
  }
}

module.exports = CMS;
