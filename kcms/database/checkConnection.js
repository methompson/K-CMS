const { Pool }  = require("mysql2");
const { MongoClient } = require("mongodb");

function checkMongoDbConnection(db) {
  if (!(db.instance instanceof MongoClient)) {
    return Promise.reject("Invalid Database Instance");
  }

  // const getter = instance.collections;
  return db.instance.db(db.dbName).collections()
    .then((results) => {
      if (results.length <= 0) {
        throw "Database Not Installed";
      }
    });
}

function checkMySQLConnection(db, dbName) {
  if (!(db.instance instanceof Pool)) {
    return Promise.reject("Invalid Database Instance");
  }

  const usersQuery = `
    SELECT * FROM information_schema.tables
    WHERE table_schema = ?
      AND table_name = ?
    LIMIT 1`;

  const usersQueryParams = [
    dbName,
    'users',
  ];

  const promisePool = db.instance.promise();
  return promisePool.execute(usersQuery, usersQueryParams)
    .then(([results]) => {
      if (results.length < 1) {
        throw "Tables Not Installed";
      }

      const pagesQuery = `
        SELECT * FROM information_schema.tables
        WHERE table_schema = ?
          AND table_name = ?
        LIMIT 1`;

      const pagesQueryParams = [
        dbName,
        'pages',
      ];

      return promisePool.execute(pagesQuery, pagesQueryParams);
    })
    .then(([results]) => {
      if (results.length < 1) {
        throw "Tables Not Installed";
      }
    });
}

module.exports = {
  checkMongoDbConnection,
  checkMySQLConnection,
};
