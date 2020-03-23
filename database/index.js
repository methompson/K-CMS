const { MongoClient } = require('mongodb');
const utils = require("../utilities");

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

exports.makeDatabaseClient = function makeDatabaseClient(options = {}) {
  if ("mongodb" in options) {
    const client = getMongoDb(options.mongodb);
    return {
      type: 'mongodb',
      instance: client,
    };
  }

  utils.endOnError("No compatible database options were provided");
  return false;
};


// eslint-disable-next-line no-unused-vars
function getMySQLDb(options = {}) {}
