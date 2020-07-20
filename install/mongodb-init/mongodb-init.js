const { makeDatabaseClient } = require("../../kcms/database");
const addAdminUser = require("./add-admin-user");
const setPages = require("./set-pages");

function mongoDbInit(mongoCredentials, adminInfo) {
  // const adminUser = 'admin';
  // const adminPassword = 'password';
  // const adminEmail = 'adminEmail@ad.min';

  // const credentials = {
  //   mongodb: {
  //     username: 'root',
  //     password: 'example',
  //     url: 'localhost:27017',
  //   },
  // };

  const credentials = {
    mongodb: {
      username: mongoCredentials.username,
      password: mongoCredentials.password,
      url: mongoCredentials.url,
    },
  };

  const db = makeDatabaseClient(credentials);

  return addAdminUser(db, adminInfo)
    .then(() => {
      return setPages(db);
    })
    .then(() => {
      console.log("Successfully Updated the Admin User and Pages");
    })
    .catch((err) => {
      console.log(err);
    })
    .then(() => {
      process.exit();
    });
}

module.exports = mongoDbInit;
