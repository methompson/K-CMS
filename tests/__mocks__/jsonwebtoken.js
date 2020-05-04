const verify = jest.fn((token, secret, opt, callback) => {
  callback(null, "test");
});

const sign = jest.fn(() => {
  return "abcdefg";
});

module.exports = {
  verify,
  sign,
};
