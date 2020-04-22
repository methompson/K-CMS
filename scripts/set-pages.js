const { makeDatabaseClient } = require("../database");

module.exports = (mongoCredentials) => {
  const db = makeDatabaseClient(mongoCredentials);
  const collection = db.instance.db("kcms").collection("pages");

  // Making slugs unique
  return collection.createIndex( { slug: 1 }, { unique: true });
};
