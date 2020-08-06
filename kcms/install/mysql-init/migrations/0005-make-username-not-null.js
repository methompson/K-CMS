const { Migration } = require("../migration");

class MyMigration extends Migration {
  doMigration(mysqlPool) {
    if (!this.isPoolValid(mysqlPool)) {
      return Promise.reject("Invalid MySQL Pool Object");
    }

    const promisePool = mysqlPool.promise();

    const editQuery = `
      ALTER TABLE users
        CHANGE username username VARCHAR(255) NOT NULL UNIQUE,
        CHANGE userType userType VARCHAR(64) NOT NULL
    `;

    return promisePool.execute(editQuery)
      .then(( [rows] ) => {
        console.log(rows);
      });
  }
}

module.exports = MyMigration;
