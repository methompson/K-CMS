/* eslint-disable prefer-arrow-callback */
function Router() {
  Router.handle();
}

Router.handle = jest.fn(function handle() {});
Router.get = jest.fn(function get() {});
Router.post = jest.fn(function post() {});
Router.all = jest.fn(function all() {});
Router.use = jest.fn(function use() {});

module.exports = Router;
