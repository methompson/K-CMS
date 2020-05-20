module.exports = function makeUsernameNotNull(mysqlPool) {
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
};
