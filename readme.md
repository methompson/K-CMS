# K-CMS

### A simple, RESTful CMS API for Node.js & Express

# Installation

TODO

# Features

The K-CMS module is designed to slot right into a Node.js Express application and provide a simple, RESTful API to allow users to build web content using their web browser.

Web pages are represented as a data structure that single page applications, like Vue and React can consume and render.

K-CMS is designed to be extensible via plugins that utilize lifecycle hooks. K-CMS is also designed to provide simple user authentication and authorization.

Currently K-CMS uses MongoDB to store web and user data. MySQL support is planned for the future.

# Basic Usage

```js
const CMS = require("k-cms");

// Create a CMS object. Pass mongodb login information as an option
const cms = CMS({
  db: {
    mongodb: {
      username: 'root',
      password: 'example',
      url: 'localhost:27017',
    },
  },
});

// Get the Express app object created by the CMS object.
const app = cms.app;

// Create a serve and start listening on port 3000
const server = http.createServer(app);
server.listen(3000);
```

The above will create a simple Express object that handles the basic features of the CMS, including:

* User authentication and authorization
* Slug-based page retrieveal
* Page CRUD administration

Page data can be retrieved using a series of URL end points. The URL end points have default values, but can be customized based upon options passed when creating the CMS object.

# Customization & Plugins

K-CMS is designed with customization and Plugins in mind. Not everyone wants their web site to follow rigid guidelines. As such, some amount of customization is available for users.

Some options allow for a user to customize their CMS, including the URLs of their end points.

Plugins are meant to further extend the functionality of an application by allowing a user to tap into the lifecycle of the app and adding functionality to those specific functions. Below is an example of creating a simple Plugin.

```js
// Import the Plugin class from k-cms
const Plugin = require("k-cms/plugin");

// The first argument is the life cycle hook. The second argument is a
// function that lets you modify data or perform a task apart
const myPlugin = new Plugin("test", (args) => {
  // Do Something
});
```

Plugins are added by making an array of Plugins and passing this array to the CMS object when instantiating it:

```js
const cms = CMS({
  // Db information, etc.
  plugins: [
    myPlugin,
  ],
});
```