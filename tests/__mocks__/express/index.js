const Router = require("./Router");

function App() {
  this.useRoutes = {};
}
App.prototype.use = jest.fn(function use(route, ...args) {
  this.useRoutes[route] = args;
});

const a = new App();

function Express() {
  return a;
}

const test = jest.fn(() => {
  return "test";
});

const routerInit = jest.fn(() => {
  const r = new Router();
  return r;
});

Express.Router = routerInit;
Express.test = test;

module.exports = Express;
