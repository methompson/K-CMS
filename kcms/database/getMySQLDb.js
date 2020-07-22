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
function getMySQLDb(options, dbName) {
  if (!isObject(options)) {
    endOnError("Improper Options Value Provided");
    return false;
  }

  const host = isString(options.host) ? options.host : "";
  const user = isString(options.username) ? options.username : "";
  const password = isString(options.password) ? options.password : "";
  const port = isNumber(options.port) ? options.port : 3306;

  if ( host.length === 0
    || user.length === 0
    || password.length === 0
  ) {
    endOnError("MySQL parameters not provided");
    return false;
  }

  const pool = mysql.createPool({
    host,
    database: dbName,
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
