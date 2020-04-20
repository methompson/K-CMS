const Router = require('./Router');

const test = jest.fn(() => {
  return "test";
});

const express = {
  Router,
  test,
};

module.exports = express;
