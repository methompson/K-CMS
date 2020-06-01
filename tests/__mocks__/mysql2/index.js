const { Pool, execute } = require("./Pool");

const createPool = jest.fn((options) => {
  return new Pool(options);
});

module.exports = {
  Pool,
  execute,
  createPool,
};
