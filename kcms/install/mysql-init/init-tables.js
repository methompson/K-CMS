const path = require('path');
const fs = require('fs');

const runMigrations = require('./run-migrations');

/**
 * This function will run all of the MySQL migrations. The tables should be
 * in numerical order and we want to run them all in order. This function
 * will scan the migrations directory for all files and run them all in
 * turn using a dynamic require. The migrations are all asyncronous, so
 * we use the array's iterator to manually iterate through the array.
 */
function initTables(db) {
  const directoryPath = path.join(__dirname, "migrations");

  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  })
    .then((files) => {
      const iterator = files[Symbol.iterator]();
      return runMigrations(iterator, db.instance);
    });
}

module.exports = initTables;
