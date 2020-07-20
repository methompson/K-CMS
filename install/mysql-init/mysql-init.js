const { getMySQLDb } = require("../../kcms/database/getMySQLDb");
const initTables = require("./init-tables");
const addAdminUser = require("./add-admin-user");
const { checkSqlInfo, checkAdminInfo } = require("../utilities");


function mysqlInit(mysqlInfo, adminInfo) {
  const sqlErr = checkSqlInfo(mysqlInfo);
  const adminErr = checkAdminInfo(adminInfo);

  if (sqlErr || adminErr) {
    console.log(sqlErr);
    console.log(adminErr);
    process.exit();
  }

  const mysqlPool = getMySQLDb(mysqlInfo);

  return initTables(mysqlPool)
    .then(() => {
      return addAdminUser(mysqlPool, adminInfo);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      process.exit();
    });
}

module.exports = mysqlInit;
