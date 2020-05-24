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
  return Promise.resolve({
    deletedCount: 1,
  });
});

const testId = "abc123";
const toString = jest.fn(() => {
  return testId;
});
const insertedId = {
  toString,
};

const insertOne = jest.fn(() => {
  const result = {
    insertedCount: 1,
    insertedId,
  };
  return Promise.resolve(result);
});

const updateOne = jest.fn(() => {
  return Promise.resolve({
    modifiedCount: 1,
  });
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

function MongoClient(url, options) {
  this.url = url;
  this.options = options;
}

MongoClient.prototype.db = jest.fn(() => {
  return {
    collection,
  };
});

MongoClient.prototype.connect = jest.fn((cb) => {
  cb(null);
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
  testId,
  insertedId,
};
