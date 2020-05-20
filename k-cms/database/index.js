const { endOnError, isObject } = require("../utilities");
const { getMongoDb } = require("./getMongoDb");
const { getMySQLDb } = require("./getMySQLdb");

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

  if ("mongodb" in options) {
    const instance = getMongoDb(options.mongodb);
    return {
      type: 'mongodb',
      instance,
    };
  }

  if ('mysql' in options) {
    const instance = getMySQLDb(options.mysql);
    return {
      type: 'mysql',
      instance,
    };
  }

  endOnError("No compatible database options were provided");
  return false;
};

module.exports = {
  makeDatabaseClient,
};
