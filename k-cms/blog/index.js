const MongoBlogController = require("./MongoBlogController");
const MySQLBlogController = require("./MySQLBlogController");
const { isObject } = require("../utilities");

const makeBlogController = (database, pluginHandler) => {
  if ( !isObject(database)
    || !('type' in database)
  ) {
    return null;
  }

  if (database.type === 'mongodb') {
    return new MongoBlogController(database, pluginHandler);
  }

  if (database.type === 'mysql') {
    return new MySQLBlogController(database, pluginHandler);
  }

  return null;
};

exports.makeBlogController = makeBlogController;
