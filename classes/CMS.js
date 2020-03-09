const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const utils = require("../utilities");

const Authenticator = require('../classes/Authenticator');
const PageController = require('../classes/PageController');
const Database = require('../classes/Database');

// We use this to instantiate an Authenticator object with default values.
// If a user passes their own routes and controller, the app would use that
// rather than these defaults
const authRoutes = require('../routes/auth');
const authController = require('../controllers/auth');

class CMS {
  constructor(options = {}) {
    if (typeof options !== typeof {}) {
      utils.endOnError("Options Must Be an Object");
    }

    this.db = this.makeDatabase(options);

    const app = express();

    app.use('/', (req, res, next) => {
      req.$cms = this;
      console.log("Always Here");
      next();
    });

    const auth = new Authenticator(authRoutes, authController, this.db);
    this.auth = auth;

    const pageController = new PageController(auth, this.db);

    const apiBase = "apiBase" in options ? options.apiBase : 'api';
    const authPath = "auth" in options ? options.authPath : 'auth';
    const pagePath = "pages" in options ? options.pagePath : 'pages';

    app.use(`/${apiBase}/${authPath}`, bodyParser.json(), cors(), auth.routes);
    app.use(`/${apiBase}/${pagePath}`, bodyParser.json(), cors(), pageController.routes);

    this.app = app;
  }

  makeDatabase(options = {}) {
    let dbOptions;

    if (
         'url' in options
      && 'username' in options
      && 'password' in options
    ) {
      dbOptions = {
        url: options.url,
        username: options.username,
        password: options.password,
      };
    } else if ( 'url' in options ) {
      dbOptions = {
        url: options.url
      };
    } else if ( 'fullUrl' in options ) {
      dbOptions = {
        fullUrl: options.fullUrl,
      };
    }

    return new Database(dbOptions);
  }
}

module.exports = CMS;