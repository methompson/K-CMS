const bcrypt = require('bcryptjs');

module.exports = (db, adminUserName, adminPassword) => {
  const collection = db.instance.db("kcms").collection("users");

  return collection.createIndex( { username: 1 }, { unique: true })
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
            userType: 'superAdmin',
            enabled: true,
          },
        },
        {
          upsert: true,
        }
      );
    });
};
