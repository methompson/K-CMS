const { getMySQLDb } = require("../../kcms/database/getMySQLDb");
const initTables = require("./init-tables");
const addAdminUser = require("./add-admin-user");

const mysqlPool = getMySQLDb({
  host: "localhost",
  port: 3306,
  databaseName: "kcms",
  username: "cms_user",
  password: "cms_pw",
});

const adminInfo = {
  firstName: 'admin',
  lastName: 'admin',
  username: 'admin',
  email: 'admin@admin.com',
  userType: 'superAdmin',
  password: 'password',
};

initTables(mysqlPool)
  .then(() => {
    return addAdminUser(mysqlPool, adminInfo);
  })
  .catch((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
