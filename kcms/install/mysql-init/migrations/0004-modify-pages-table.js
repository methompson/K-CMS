module.exports = function changeUpdatedNames(mysqlPool) {
  const promisePool = mysqlPool.promise();

  const columnsQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'pages'
  `;

  const editQuery = `
    ALTER TABLE pages
      CHANGE lastUpdated dateUpdated DATETIME NOT NULL,
      ADD dateAdded DATETIME NOT NULL
  `;

  return promisePool.execute(columnsQuery)
    .then(( [rows] ) => {
      // const [rows] = result;

      let dateAdded = false;
      let dateUpdated = false;
      rows.forEach((row) => {
        if (row.COLUMN_NAME === 'dateAdded') {
          dateAdded = true;
        }
        if (row.COLUMN_NAME === 'dateUpdated') {
          dateUpdated = true;
        }
      });

      if (dateAdded && dateUpdated) {
        return Promise.resolve();
      }

      console.log("Adding dateAdded and updating dateUpdated");
      return promisePool.execute(editQuery)
        .then(( [addRows] ) => {
          console.log(addRows);
        });
    });
};
