module.exports = function makePageTable(mysqlPool) {
  const poolPromise = mysqlPool.promise();

  const addPagesQuery = `
    CREATE TABLE IF NOT EXISTS pages (
      id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(512) NOT NULL,
      slug VARCHAR(512) UNIQUE NOT NULL,
      enabled BOOLEAN NOT NULL,
      content JSON NOT NULL,
      meta JSON NOT NULL,
      lastUpdated DATETIME NOT NULL
    )
  `;

  return poolPromise.execute(addPagesQuery)
    .then(( [rows] ) => {
      // just in case I want to view the results
      console.log(rows);
    });
};
