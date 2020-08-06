const { Migration } = require("../migration");

class MyMigration extends Migration {
  doMigration(mysqlPool) {
    if (!this.isPoolValid(mysqlPool)) {
      return Promise.reject("Invalid MySQL Pool Object");
    }

    const poolPromise = mysqlPool.promise();

    const columnNameQuery = `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
    `;

    const addColumnQuery = `
      ALTER TABLE users
        ADD userMeta JSON
    `;

    return poolPromise.execute(columnNameQuery)
      .then(( [rows] ) => {
        // const [rows] = result;

        let included = false;
        rows.forEach((row) => {
          if (row.COLUMN_NAME === 'userMeta') {
            included = true;
          }
        });

        if (included) {
          return Promise.resolve();
        }

        console.log("Adding User Meta");
        return poolPromise.execute(addColumnQuery)
          .then(( [addRows] ) => {
            console.log(addRows);
          });
      });
  }
}

module.exports = MyMigration;
