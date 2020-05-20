module.exports = function makeUserTable(mysqlPool) {
  const poolPromise = mysqlPool.promise();

  const addUsersQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    username VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    userType VARCHAR(64),
    password CHAR(60) NOT NULL,
    passwordResetToken CHAR(64),
    passwordResetDate CHAR(64)
  )
`;

  return poolPromise.execute(addUsersQuery)
    .then(( [rows] ) => {
      // just in case I want to view the results
      console.log(rows);
    });
};
