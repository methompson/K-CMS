const { MongoClient } = require('mongodb');
const {
  endOnError,
  isObject,
  isUndefined,
  isString,
} = require("../utilities");

/**
 * Creates a MongoDB client.
 *
 * @param {Object} options object of options from which to make a database
 * @returns {MongoClient}
 */
function getMongoDb(options) {
  if (!isObject(options)) {
    endOnError("Improper Options Value Provided");
    return false;
  }

  let mongoUrl = "";
  if (isString(options.fullUrl)) {
    mongoUrl = options.fullUrl;

  } else if (isString(options.username)
          && isString(options.password)
          && isString(options.url)
  ) {
    mongoUrl = `mongodb://${options.username}:${options.password}@${options.url}`;

  } else if (isString(options.url) ) {
    mongoUrl = `mongodb://${options.url}`;

  } else if (!isUndefined(options)
    && options.mongoInstance instanceof MongoClient
  ) {
    const client = options.mongoInstance;
    return client;
  }

  if (mongoUrl.length <= 0) {
    endOnError("MongoDB parameters not provided");
    return false;
  }

  const client = new MongoClient(mongoUrl, {
    useUnifiedTopology: true,
  });

  client.connect((err) => {
    if (err !== null) {
      endOnError(`MongoDB Unable to connect - ${err}`);
    }
  });

  return client;
}

module.exports = {
  getMongoDb,
};
