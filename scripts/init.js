const addAdminUser = require("./add-admin-user");
const setPages = require("./set-pages");

const mongoCredentials = {
  mongodb: {
    username: 'root',
    password: 'example',
    url: 'localhost:27017',
  },
};

const adminUser = 'admin';
const adminPassword = 'password';

addAdminUser(mongoCredentials, adminUser, adminPassword)
  .then(() => {
    return setPages(mongoCredentials);
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
