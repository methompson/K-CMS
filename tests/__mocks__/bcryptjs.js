const compare = jest.fn(() => {
  return Promise.resolve(true);
});

const hash = jest.fn(() => {
  return Promise.resolve("a hashed value");
});

module.exports = {
  compare,
  hash,
};
