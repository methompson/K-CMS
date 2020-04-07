const bcrypt = require('bcryptjs');

const { makeDatabaseClient } = require("../database");

const mongoCredentials = {
  mongodb: {
    username: 'root',
    password: 'example',
    url: 'localhost:27017',
  },
};

const db = makeDatabaseClient(mongoCredentials);
const collection = db.instance.db("kcms").collection("users");

const adminUser = 'admin';

bcrypt.hash("password", 12)
  .then((result) => {
    console.log(result);
    return collection.updateOne(
      {
        user: adminUser,
      },
      {
        $set: {
          user: adminUser,
          password: result,
        },
      },
      {
        upsert: true,
      }
    );
  })
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.log("Error Hashing Password", err);
  });
