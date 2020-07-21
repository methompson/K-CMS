const bcrypt = require('bcryptjs');

const { isUndefined } = require("../../utilities/isData");

function addAdminUser(mysqlPool, adminInfo) {
  const firstName = isUndefined(adminInfo.firstName) ? "" : adminInfo.firstName;
  const lastName = isUndefined(adminInfo.lastName) ? "" : adminInfo.lastName;

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
        firstName,
        lastName,
        adminInfo.username,
        adminInfo.email,
        'superAdmin',
        hashedPassword,
        now,
        now,
      ]);
    });
}

module.exports = addAdminUser;
