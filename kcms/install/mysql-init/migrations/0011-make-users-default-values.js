const { Migration } = require("../migration");

class MyMigration extends Migration {
  doMigration(mysqlPool) {
    if (!this.isPoolValid(mysqlPool)) {
      return Promise.reject("Invalid MySQL Pool Object");
    }

    const promisePool = mysqlPool.promise();

    const editQuery = `
      ALTER TABLE users
        CHANGE userType userType VARCHAR(64) NOT NULL DEFAULT "",
        CHANGE dateUpdated dateUpdated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHANGE dateAdded dateAdded DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `;

    return promisePool.execute(editQuery)
      .then(( [rows] ) => {
        console.log(rows);
      });
  }
}

module.exports = MyMigration;
