const { getMySQLDb } = require("../../database/getMySQLDb");
const { isObject, isString } = require("../../utilities");
const initTables = require("./init-tables");

function manualMigrate(config) {
  if (isObject(config.mysql)) {
    const dbName = isString(config.mysql.databaseName)
      && config.mysql.databaseName.length > 0
      ? config.mysql.databaseName
      : "kcms";

    const instance = getMySQLDb(config.mysql, dbName);

    const db = {
      type: 'mysql',
      dbName,
      instance,
    };

    initTables(db)
      .then(() => {
        console.log("Done Migrating Database");
      })
      .catch((err) => {
        console.log("Error Migrating Databases", err);
      })
      .finally(() => {
        process.exit();
      });
  } else {
    console.log("Invalid Configuration");
    process.exit();
  }

}

module.exports = manualMigrate;
