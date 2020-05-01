const Router = require("./Router");

const test = jest.fn(() => {
  return "test";
});

// const routerGet = jest.fn(() => {});
// const routerPost = jest.fn(() => {});
// const routerAll = jest.fn(() => {});

// const routerInit = jest.fn(() => {
//   return {
//     get: routerGet,
//     post: routerPost,
//     all: routerAll,
//   };
// });

const routerInit = jest.fn(() => {
  const r = new Router();
  return r;
});

const express = {
  Router: routerInit,
  test,
};

module.exports = express;
