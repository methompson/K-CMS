const { MongoClient } = require('mongodb');
const { endOnError, isObject } = require("../utilities");

/**
 * Creates a MongoDB client.
 *
 * @param {Object} options object of options from which to make a database
 * @returns {MongoClient}
 */
function getMongoDb(options = {}) {
  let mongoUrl = "";
  if ('fullUrl' in options) {
    mongoUrl = options.fullUrl;
  } else if ('username' in options
          && 'password' in options
          && 'url' in options
  ) {
    mongoUrl = `mongodb://${options.username}:${options.password}@${options.url}`;
  } else if ('url' in options ) {
    mongoUrl = `mongodb://${options.url}`;
  } else if ('mongoInstance' in options) {
    const client = options.mongoInstance;
    return client;
  }

  if (mongoUrl.length <= 0) {
    console.log("MongoDB parameters not provided");
    process.exit(1);
  }

  const client = new MongoClient(mongoUrl, {
    useUnifiedTopology: true,
  });


  client.connect((err) => {
    if (err !== null) {
      console.log("MongoDB Unable to connect", err);
      process.exit(1);
    }
  });

  return client;
}

/**
 * Creates a MySQL client (UNFINISHED)
 * @param {*} options
 */
// eslint-disable-next-line no-unused-vars
function getMySQLDb(options = {}) {}

/**
 * Accepts an object of parameters and makes a Database client
 *
 * @param {Object} options Options parameters from which to make a database object
 * @returns {Object} An object containing the actual database object and an identifier of the type of database
 */
const makeDatabaseClient = (options = {}) => {
  if (!isObject(options)) {
    endOnError("Invalid Options Object Passed to makeDatabaseClient");
    return false;
  }

  if ("mongodb" in options) {
    const client = getMongoDb(options.mongodb);
    return {
      type: 'mongodb',
      instance: client,
    };
  }

  endOnError("No compatible database options were provided");
  return false;
};

exports.makeDatabaseClient = makeDatabaseClient;
