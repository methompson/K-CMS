const { Migration } = require("../migration");

class MyMigration extends Migration {
  doMigration(mysqlPool) {
    if (!this.isPoolValid(mysqlPool)) {
      return Promise.reject("Invalid MySQL Pool Object");
    }

    const promisePool = mysqlPool.promise();

    const editQuery = `
      ALTER TABLE blogPosts
        CHANGE draft draft BOOLEAN NOT NULL DEFAULT true,
        CHANGE public public BOOLEAN NOT NULL DEFAULT false,
        CHANGE content content JSON NOT NULL DEFAULT (JSON_ARRAY()),
        CHANGE meta meta JSON NOT NULL DEFAULT (JSON_OBJECT()),
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
