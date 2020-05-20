function Pool() {}

const execute = jest.fn(() => {
  return Promise.resolve();
});

Pool.prototype.promise = jest.fn(() => {
  return {
    execute,
  };
});

module.exports = {
  Pool,
  execute,
};
