const verify = jest.fn((token, secret, opt, callback) => {
  callback(null, "test");
});

module.exports = {
  verify,
};
