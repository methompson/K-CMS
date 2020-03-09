class Authenticator {
  constructor(authenticationRoutes, authenticationController, database) {
    this.authenticationRoutes = authenticationRoutes;
    this.authenticationController = authenticationController;
    this.db = database;
  }

  get routes() {
    return this.authenticationRoutes;
  }

  get controller() {
    return this.authenticationController;
  }
}

module.exports = Authenticator;