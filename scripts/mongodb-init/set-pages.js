module.exports = (db) => {
  const collection = db.instance.db("kcms").collection("pages");

  // Making slugs unique
  return collection.createIndex( { slug: 1 }, { unique: true });
};
