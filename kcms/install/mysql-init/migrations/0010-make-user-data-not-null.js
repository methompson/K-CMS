const { Migration } = require("../migration");

class MyMigration extends Migration {
  doMigration(mysqlPool) {
    if (!this.isPoolValid(mysqlPool)) {
      return Promise.reject("Invalid MySQL Pool Object");
    }

    const poolPromise = mysqlPool.promise();

    const columnNameQuery = `
      SELECT
        COLUMN_NAME,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_TYPE,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
    `;

    return poolPromise.execute(columnNameQuery)
      .then(( [rows] ) => {
        const nullQueries = [];
        let alterQuery = "ALTER TABLE users";

        rows.forEach((row) => {
          console.log("Row: ", row);
          if (row.IS_NULLABLE === "YES") {
            let defaultVal;
            let setVal;

            const type = row.DATA_TYPE.toLowerCase();

            if (type === "varchar"
              || type === "char"
              || type === "text"
            ) {
              setVal = `""`;
              defaultVal = `""`;
            } else if ( type === "json") {
              // return;
              setVal = `"{}"`;
              defaultVal = "(JSON_OBJECT())";
            }

            const nullQuery = `UPDATE users SET ${row.COLUMN_NAME} = ${setVal} WHERE ${row.COLUMN_NAME} IS NULL`;
            nullQueries.push(nullQuery);
            alterQuery += ` CHANGE ${row.COLUMN_NAME} ${row.COLUMN_NAME} ${row.COLUMN_TYPE.toUpperCase()} NOT NULL DEFAULT ${defaultVal},`;
          }
        });

        // If we have nothing to do, we won't go any further.
        if (nullQueries.length === 0) {
          return Promise.resolve();
        }

        alterQuery = alterQuery.substring(0, alterQuery.length - 1);
        console.log(alterQuery, nullQueries);

        const promises = [];

        nullQueries.forEach((query) => {
          console.log(query);
          promises.push(poolPromise.execute(query));
        });

        return Promise.all(promises)
          .then(() => {
            return poolPromise.execute(alterQuery);
          });
      });
  }
}

module.exports = MyMigration;
