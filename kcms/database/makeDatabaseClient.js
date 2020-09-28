const { endOnError, isObject, isString } = require("../utilities");
const { getMongoDb } = require("./getMongoDb");
const { getMySQLDb } = require("./getMySQLDb");

/**
 * Accepts an object of parameters and makes a Database client
 *
 * @param {Object} options Options parameters from which to make a database object
 * @returns {Object} An object containing the actual database object and an identifier of the type of database
 */
const makeDatabaseClient = (options) => {
  if (!isObject(options)) {
    endOnError("Invalid Options Object Passed to makeDatabaseClient");
    return false;
  }

  if (isObject(options.mongodb)) {
    const instance = getMongoDb(options.mongodb);
    const dbName = isString(options.mongodb.databaseName)
      && options.mongodb.databaseName.length > 0
      ? options.mongodb.databaseName
      : "kcms";

    return {
      type: 'mongodb',
      dbName,
      instance,
    };
  }

  if (isObject(options.mysql)) {
    const dbName = isString(options.mysql.databaseName)
      && options.mysql.databaseName.length > 0
      ? options.mysql.databaseName
      : "kcms";

    const instance = getMySQLDb(options.mysql, dbName);

    return {
      type: 'mysql',
      dbName,
      instance,
    };
  }

  endOnError("No compatible database options were provided");
  return false;
};

module.exports = {
  makeDatabaseClient,
};
