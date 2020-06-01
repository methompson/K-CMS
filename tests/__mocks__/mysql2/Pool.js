function Pool(options) {
  this.options = options;
}

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
