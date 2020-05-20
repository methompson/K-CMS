const { Pool, execute } = require("./Pool");

const createPool = jest.fn(() => {
  return new Pool();
});

module.exports = {
  Pool,
  execute,
  createPool,
};
