const mysql = require('mysql2');

const {
  endOnError,
  isObject,
  isString,
  isNumber,
} = require("../utilities");

/**
 * Creates a MySQL client (UNFINISHED)
 * Requirements:
 * host
 * database
 * user
 * password
 * @param {Object} options
 */
function getMySQLDb(options) {
  if (!isObject(options)) {
    endOnError("Improper Options Value Provided");
    return false;
  }

  const host = "host" in options && isString(options.host) ? options.host : "";
  const database = "databaseName" in options && isString(options.databaseName) ? options.databaseName : "";
  const user = "username" in options && isString(options.username) ? options.username : "";
  const password = "password" in options && isString(options.password) ? options.password : "";
  const port = "port" in options && isNumber(options.port) ? options.port : 3306;

  if ( host.length === 0
    || database.length === 0
    || user.length === 0
    || password.length === 0
  ) {
    endOnError("MySQL parameters not provided");
    return false;
  }

  const pool = mysql.createPool({
    host,
    database,
    user,
    password,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

module.exports = {
  getMySQLDb,
};
