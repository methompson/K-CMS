const addAdminUser = require("./add-admin-user");
const setPages = require("./set-pages");
const { checkAdminInfo } = require("../utilities");

function mongoDbInit(db, adminInfo) {
  const adminErr = checkAdminInfo(adminInfo);

  if (adminErr) {
    return Promise.reject(adminErr);
  }

  return addAdminUser(db, adminInfo)
    .then(() => {
      return setPages(db);
    })
    .then(() => {
      console.log("Successfully Updated the Admin User and Pages");
    });
}

module.exports = mongoDbInit;
