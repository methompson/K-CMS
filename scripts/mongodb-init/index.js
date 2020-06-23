const { makeDatabaseClient } = require("../../k-cms/database");
const addAdminUser = require("./add-admin-user");
const setPages = require("./set-pages");

const mongoCredentials = {
  mongodb: {
    username: 'root',
    password: 'example',
    url: 'localhost:27017',
  },
};

const db = makeDatabaseClient(mongoCredentials);

const adminUser = 'admin';
const adminPassword = 'password';
const adminEmail = 'adminEmail@ad.min';

addAdminUser(db, adminUser, adminPassword, adminEmail)
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
