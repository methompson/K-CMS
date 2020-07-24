const { EventEmitter } = require("events");

const Router = require("./Router");

const a = new EventEmitter();

function Express() {
  return a;
}

const test = jest.fn(() => {
  return "test";
});

const routerInit = jest.fn(() => {
  return Router;
});

Express.Router = routerInit;
Express.RouterClass = Router;
Express.test = test;

module.exports = Express;
