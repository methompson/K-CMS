/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */

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
  return require(filePath)(mysqlPool)
    .then(() => {
      console.log(`Finished With ${result.value}`);
      return runMigrations(iterator, mysqlPool);
    });
}

module.exports = runMigrations;
