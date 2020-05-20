module.exports = function addUserMeta(mysqlPool) {
  const poolPromise = mysqlPool.promise();

  const columnNameQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users'
  `;

  const addColumnQuery = `
    ALTER TABLE users
      ADD dateUpdated DATETIME NOT NULL
  `;

  return poolPromise.execute(columnNameQuery)
    .then(( [rows] ) => {
      // const [rows] = result;

      let included = false;
      rows.forEach((row) => {
        if (row.COLUMN_NAME === 'dateUpdated') {
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
