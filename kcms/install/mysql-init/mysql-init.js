const initTables = require("./init-tables");
const addAdminUser = require("./add-admin-user");
const { checkAdminInfo } = require("../utilities");


function mysqlInit(mysqlInstance, adminInfo) {
  const adminErr = checkAdminInfo(adminInfo);

  if (adminErr) {
    return Promise.reject(adminErr);
  }

  return initTables(mysqlInstance)
    .then(() => {
      return addAdminUser(mysqlInstance, adminInfo);
    });
}

module.exports = mysqlInit;
