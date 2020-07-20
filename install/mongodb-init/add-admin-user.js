const bcrypt = require('bcryptjs');

const { isUndefined } = require("../../kcms/utilities/isData");

module.exports = (db, adminInfo) => {
  let collection;

  const firstName = isUndefined(adminInfo.firstName) ? "" : adminInfo.firstName;
  const lastName = isUndefined(adminInfo.lastName) ? "" : adminInfo.lastName;

  const userData = {
    firstName,
    lastName,
    username: adminInfo.username,
    email: adminInfo.email,
    userType: 'superAdmin',
    enabled: true,
  };

  return db.instance.db("kcms").createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["username", "password", "email", "enabled"],
        properties: {
          username: {
            bsonType: "string",
            description: "username is required and must be a string",
          },
          password: {
            bsonType: "string",
            description: "password is required and must be a string",
          },
          email: {
            bsonType: "string",
            description: "email is required and must be a string",
          },
          enabled: {
            bsonType: "bool",
            description: "enabled is required and must be a boolean",
          },
        },
      },
    },
  })
    .then((col) => {
      collection = col;
      return collection.createIndex( { username: 1 }, { unique: true });
    })
    .then(() => {
      return collection.createIndex( { email: 1 }, { unique: true });
    })
    .then(() => {
      return bcrypt.hash(adminInfo.password, 12);
    })
    .then((result) => {
      userData.password = result;

      return collection.updateOne(
        {
          username: userData.username,
        },
        {
          // $set: {
          //   username: adminUserName,
          //   password: result,
          //   email: adminEmail,
          //   userType: 'superAdmin',
          //   enabled: true,
          // },
          $set: userData,
        },
        {
          upsert: true,
        }
      );
    })
    .catch((err) => {
      console.log(err);
    });
};
