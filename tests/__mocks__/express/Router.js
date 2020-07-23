function Router() {
  this.routes = {
    get: {},
    post: {},
    all: {},
    use: {},
  };
}
Router.prototype.get = jest.fn(function get(route, ...args) {
  this.routes.get[route] = args;
});
Router.prototype.post = jest.fn(function post(route, ...args) {
  this.routes.post[route] = args;
});
Router.prototype.all = jest.fn(function all(route, ...args) {
  this.routes.all[route] = args;
});
Router.prototype.use = jest.fn(function use(route, ...args) {
  this.routes.use[route] = args;
});

Router.prototype.getRoutes = jest.fn(function getRoutes() {
  return this.routes;
});

module.exports = Router;
