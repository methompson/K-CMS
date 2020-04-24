const test = jest.fn(() => {
  return "test";
});

const routerGet = jest.fn(() => {});
const routerPost = jest.fn(() => {});
const routerAll = jest.fn(() => {});

const routerInit = jest.fn(() => {
  return {
    get: routerGet,
    post: routerPost,
    all: routerAll,
  };
});

const express = {
  Router: routerInit,
  test,
};

module.exports = express;
