function MongoClient(url, options) {
  this.url = url;
  this.options = options;
}

MongoClient.prototype.connect = jest.fn(() => {});

const findToArray = jest.fn(() => {});

const findOne = jest.fn(() => {
  return Promise.resolve();
});
const find = jest.fn(() => {
  return {
    toArray: findToArray,
  };
});
const deleteOne = jest.fn(() => {
  return Promise.resolve();
});
const insertOne = jest.fn(() => {
  return Promise.resolve();
});
const updateOne = jest.fn(() => {
  return Promise.resolve();
});

const collection = jest.fn(() => {
  return {
    findOne,
    find,
    deleteOne,
    insertOne,
    updateOne,
  };
});

MongoClient.prototype.db = jest.fn(() => {
  return {
    collection,
  };
});

module.exports = {
  MongoClient,
  findToArray,
  findOne,
  find,
  deleteOne,
  insertOne,
  updateOne,
  collection,
};
