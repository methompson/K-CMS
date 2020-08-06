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

### MySQL-Specific

KCMS requires that you create a database in MySQL before you can install the application. The default database name is `kcms`, but you can define the database's name by passing a databaseName into the database configuration.

### Set Up the Project

Creating and starting a KCMS application only requires creating a kcms object and having the node server listen for requests:

```js
const http = require('http');
const makeKCMS = require("kcms");

// Create a CMS object. Pass mongodb login information as an option
const kcms = makeKCMS({
  db: {
    mongodb: {
      url: 'localhost:27017',
      databaseName: "kcms",
      username: 'root',
      password: 'example',
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

### Uninitialized State

On first run, the application will be in an uninitialized state. All routes (except those defined by the user after creating the KCMS application) will send an HTTP 503 status code indicating that the database has not been installed. You will need to send a request to the installation route to configure and set up the KCMS application.

### Install Route

The install route is only available during the uninitialized state. The install route accepts administrator information and sets up all of the databases with the admin's information in mind.

`POST /install`

Available Parameters:

| Name | Type | Required | Comments |
| - | - | - | - |
| firstName | String | no | |
| lastName | String | no | |
| username | String | yes | The user uses this to log in |
| email | String | yes | |
| password | String | yes | |

Example:
```json
{
    "adminInfo": {
        "firstName": "admin",
        "lastName": "admin",
        "username": "admin",
        "email": "admin@ad.min",
        "password": "password"
    }
}
```

On success, the application will send a 200 status and reset the routes.

### End Result

makeKCMS will create an Express object and several routes that handle the following tasks:

* User authentication and authorization
* Slug-based page retrieveal
* Page CRUD administration
* Blog creation and management

Page data can be retrieved using a series of URL end points. The URL end points have default values, but can be customized based upon options passed when creating the CMS object.

By default, all API end points are accessed via the `/api/` path.

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