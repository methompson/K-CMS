const bcrypt = require('bcryptjs');

module.exports = (db, adminUserName, adminPassword, adminEmail) => {
  let collection;

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
      return bcrypt.hash(adminPassword, 12);
    })
    .then((result) => {
      console.log(result);
      return collection.updateOne(
        {
          username: adminUserName,
        },
        {
          $set: {
            username: adminUserName,
            password: result,
            email: adminEmail,
            userType: 'superAdmin',
            enabled: true,
          },
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
