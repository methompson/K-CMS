const { Pool } = require('mysql2');

class Migration {
  doMigration() {}

  isPoolValid(mysqlPool) {
    return mysqlPool instanceof Pool;
  }
}

module.exports = {
  Migration,
};
