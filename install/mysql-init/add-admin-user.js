const bcrypt = require('bcryptjs');

module.exports = function addAdminUser(mysqlPool, adminInfo) {
  const poolPromise = mysqlPool.promise();
  const now = new Date();
  const addAdminQuery = `
    REPLACE INTO users (
      firstName,
      lastName,
      username,
      email,
      userType,
      password,
      dateAdded,
      dateUpdated
    )
    VALUES (
      ?,?,?,?,?,?,?,?
    )
  `;

  return bcrypt.hash(adminInfo.password, 12)
    .then((hashedPassword) => {
      return poolPromise.execute(addAdminQuery, [
        adminInfo.firstName,
        adminInfo.lastName,
        adminInfo.username,
        adminInfo.email,
        adminInfo.userType,
        hashedPassword,
        now,
        now,
      ]);
    });
};
