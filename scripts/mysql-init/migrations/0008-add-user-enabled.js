module.exports = function addUserMeta(mysqlPool) {
  const poolPromise = mysqlPool.promise();

  const columnNameQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users'
  `;

  const addColumnQuery = `
    ALTER TABLE users
      ADD enabled BOOLEAN NOT NULL DEFAULT false
  `;

  return poolPromise.execute(columnNameQuery)
    .then(( [rows] ) => {
      // const [rows] = result;

      let included = false;
      rows.forEach((row) => {
        if (row.COLUMN_NAME === 'enabled') {
          included = true;
        }
      });

      if (included) {
        return Promise.resolve();
      }

      console.log("Adding User Date Added");
      return poolPromise.execute(addColumnQuery)
        .then(( [addRows] ) => {
          console.log(addRows);
        });
    });
};
