/* eslint-disable no-unused-vars */
/* eslint-disable lines-between-class-members */
// These rules are disabled because the PageController class has some empty functions
// with variable parameters that are used as interfaces.
const express = require('express');
const jwt = require('jsonwebtoken');

class PageController {
  constructor(authenticator, database, plugins) {
    this.db = database;
    this.plugins = plugins;
    this.authenticator = authenticator;
    const authController = this.authenticator.controller;

    this.router = express.Router();
    this.router.use(this.getTokenFromHeaders);

    // this.router.get('/', authController.passThrough,  pagesController.doNothing);
    this.router.get('/addtest', (req, res) => {
      this.addPage();
      res.status(200).send("<h1>Adding Page</h1>");
    });

    this.router.post('/add-page',
      authController.authorizeUser,
      (req, res) => {
        if ( !('body' in req)
          || !('page' in req.body)
        ) {
          res.status(400).json({
            msg: "Invalid page object",
          });
        }

        this.addPage(req.body.page)
          .then((data) => {
            res.status(200).json({});
          })
          .catch((err) => {
            const msg = err.msg || err.message;
            res.status(400).json({
              msg,
            });
          });
      });

    this.router.post('/edit-page',
      authController.authorizeUser,
      (req, res) => {
        if ( !('body' in req)
          || !('page' in req.body)
          || !('id' in req.body)
        ) {
          res.status(400).json({
            msg: "Invalid page object",
          });
        }

        this.editPage(req.body.id, req.body.page)
          .then((data) => {
            res.status(200).json({});
          })
          .catch((err) => {
            const msg = err.msg || err.message;
            res.status(400).json({
              msg,
            });
          });
      });

    this.router.get('/:slug', authController.authorizeUser, (req, res) => {
      console.log(this.plugins.length);
      console.log('request', req.params);
      this.getPageBySlug(req.params.slug)
        .then((docs) => {
          res.status(200).json(docs);
        });
    });
  }

  get pageTypes() {
    return {};
  }

  get paramTypes() {
    return {
      string: (param) => typeof param === typeof "string",
      number: (param) => typeof param === typeof 1,
      object: (param) => typeof param === typeof {},
      array: (param) => Array.isArray(param),
      boolean: (param) => typeof param === typeof true,
    };
  }

  get routes() {
    return this.router;
  }

  /**
   * This middleware checks for the existence of the authorization header,
   * retrieves the JWT from it and adds it to the request object. If the
   * token doesn't exist, an empty string is added in its place.
   *
   * @param {Object} req Express Request object
   * @param {Object} res Express response object
   * @param {Function} next Express next function
   */
  getTokenFromHeaders(req, res, next) {
    // Do we have the authorization header?
    // Is the authorization header structured correctly?
    if (  !('authorization' in req.headers)
      ||  req.headers.authorization.split(' ').length < 2
      ||  req.headers.authorization.split(' ')[0] !== "Bearer"
    ) {
      // The empty values below are NOT bad, they just denote that there is
      // no user connected to this request
      req._token = "";
      req._user = {};
      next();
      return;
    }

    const token = req.headers.authorization.split(' ')[1];
    req._token = token;
    jwt.verify(token, global.jwtSecret, (err, decoded) => {
      if (err) {
        // Do Something with the Error
        return;
      }

      req._user = decoded;
      next();
    });
  }

  // Interfaces to be defined on a per-database basis
  getPageBySlug(slug = "") {}
  getPublicPageList() {}
  getFullPageList() {}
  addPage(pageData = {}) {}
  editPage(id, pageData = {}) {}
  deletePage(pageData = {}) {}
}

module.exports = PageController;
