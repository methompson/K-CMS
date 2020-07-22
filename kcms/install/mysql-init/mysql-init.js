const initTables = require("./init-tables");
const addAdminUser = require("./add-admin-user");
const { checkAdminInfo } = require("../utilities");

function mysqlInit(db, adminInfo) {
  const adminErr = checkAdminInfo(adminInfo);

  if (adminErr) {
    return Promise.reject(adminErr);
  }

  return initTables(db)
    .then(() => {
      return addAdminUser(db, adminInfo);
    });
}

module.exports = mysqlInit;
