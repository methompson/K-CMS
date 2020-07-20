# KCMS

### A simple, RESTful CMS API for Node.js & Express

# Features

The KCMS module is a CMS (content management system) API. It's designed to provide a simple RESTful API that provides CRUD functions for said CMS. KCMS also provides an API for blogging.

The KCMS module is designed to slot right into a Node.js Express application and provide a simple, RESTful API to allow users to build web content using their web browser.

Web pages are represented as a data structure that JS frameworks, like Vue and React can consume and render easily.

KCMS is designed to be extensible via plugins that utilize lifecycle hooks. KCMS is also designed to provide simple user authentication and authorization.

Both MongoDB and MySQL are supported databases for the back end of KCMS.

# Installation

### Install the module from NPM

```
npm i kcms
```

### Run the installation Script for MySQL or MongoDb
The database needs to be prepared for the application. For MySQl, a database and several tables are created. A super admin user is created afterward.

For MongoDb, a super admin user is created and an index is created for pages. The MongoDb indexs are made to enforce uniqueness for some fields.

### Installing the MySQL Database
```js
const mysqlInit = require("kcms/install/mysql-init");

const adminInfo = {
  firstName: 'admin',
  lastName: 'admin',
  username: 'admin',
  email: 'admin@admin.com',
  password: 'password',
};

const mysqlInfo = {
  host: "localhost",
  port: 3306,
  databaseName: "kcms",
  username: "db_user",
  password: "db_password",
};

mysqlInit(mysqlInfo, adminInfo);
```

### Installing the MongoDb Database

```js
const mongoInit = require("./kcms/install/mongodb-init")

const adminInfo = {
  firstName: 'admin',
  lastName: 'admin',
  username: 'admin',
  email: 'admin@admin.com',
  password: 'password',
};

const mongoCredentials = {
  username: 'db_user',
  password: 'db_password',
  url: 'localhost:27017',
};

mongoInit(mongoCredentials, adminInfo);
```

# Basic Usage

Creating and starting a KCMS application only requires creating a kcms object and having the node server listen for requests:

```js
const http = require('http');
const makeKCMS = require("kcms");

// Create a CMS object. Pass mongodb login information as an option
const kcms = makeKCMS({
  db: {
    mongodb: {
      username: 'root',
      password: 'example',
      url: 'localhost:27017',
    },
  },
});

// Get the Express app object created by the CMS object.
const app = kcms.app;

// Create a server and start listening on port 3000
const server = http.createServer(app);
server.listen(3000);
```

MySQL based applications use the following object instantiation:

```js
const kcms = makeKCMS({
  db: {
    mysql: {
      host: "localhost",
      port: 3306,
      databaseName: "kcms",
      username: "cms_user",
      password: "cms_pw",
    },
  },
});
```

The above will create a Express object and several routes that handle the following tasks:

* User authentication and authorization
* Slug-based page retrieveal
* Page CRUD administration
* Blog creation and management

Page data can be retrieved using a series of URL end points. The URL end points have default values, but can be customized based upon options passed when creating the CMS object.

By default, all API end points are accessed via the /api/ path.

[Read the API Reference](api-reference.md)

# Customization & Plugins

KCMS is designed with customization and Plugins in mind. Not everyone wants their web site to follow rigid guidelines. As such, some amount of customization is available for users.

Some options allow for a user to customize their CMS, including the URLs of their end points.

Plugins are meant to further extend the functionality of an application by allowing a user to tap into the lifecycle of the app and adding functionality to those specific functions. Below is an example of creating a simple Plugin.

```js
// Import the Plugin class from kcms
const KCMSPlugin = require("kcms/plugin");

// We make a new object.
const myPlugin = new KCMSPlugin();

// We have to add a function for each lifecycle hook.
// The first argument is the life cycle hook. The second argument is a function that performs an action.
myPlugin.addHook("test", (args) => {
  // Do Something
});

// You can add as many lifecycle hooks as you want to an individual plugin
```

Plugins are added by making an array of Plugins and passing this array to the CMS object when instantiating it:

```js
const cms = makeKCMS({
  // Db information, etc.
  plugins: [
    myPlugin,
  ],
});
```