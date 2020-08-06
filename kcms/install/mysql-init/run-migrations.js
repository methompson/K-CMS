/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const { Migration } = require("./migration");

/**
 * Runs an SQL migration. This function retrieves the next value from the
 * iterator, checks if it's done. If it's not done, it runs the migration
 * function for the specified file. The function recursively calls itself
 * to run the next migration file.
 *
 * @param {Iterator} iterator the migrations files array iterator
 * @param {Pool} mysqlPool MySQL connection pool
 */
function runMigrations(iterator, mysqlPool) {
  const result = iterator.next();

  if (result.done) {
    return Promise.resolve();
  }

  const filePath = `./migrations/${result.value}`;
  const MyMigration = require(filePath);

  let p;

  if (!(MyMigration.prototype instanceof Migration)) {
    console.log(`${result.value} is not a valid Migration`);
    p = Promise.resolve();
  } else {
    const myMigration = new MyMigration();
    p = myMigration.doMigration(mysqlPool);
  }

  // return require(filePath)(mysqlPool)
  return p.then(() => {
    console.log(`Finished With ${result.value}`);
    return runMigrations(iterator, mysqlPool);
  });
}

module.exports = runMigrations;
