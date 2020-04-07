/* eslint-disable no-unused-vars */
/* eslint-disable lines-between-class-members */
// These rules are disabled because the PageController class has some empty functions
// with variable parameters that are used as interfaces.
const express = require('express');

const { ParamChecker } = require("../utilities");

class PageController extends ParamChecker {
  constructor(authenticator, database, plugins) {
    // Does nothing, but required nonetheless...
    super();

    this.db = database;
    this.plugins = plugins;
    this.authenticator = authenticator;
    const authController = this.authenticator.controller;

    this.router = express.Router();

    this.router.get('/addtest', (req, res) => {
      this.addPage();
      res.status(200).send("<h1>Adding Page</h1>");
    });

    this.router.post('/add-page',
      (req, res) => {
        if ( !('body' in req)
          || !('page' in req.body)
        ) {
          res.status(400).json({
            msg: "Invalid page object",
          });
          return;
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
      (req, res) => {
        console.log("Editing Page");
        if ( !('body' in req)
          || !('page' in req.body)
          || !('id' in req.body)
        ) {
          res.status(400).json({
            msg: "Invalid page object",
          });
        }

        if (!req._authData) {
          res.status(401).json({
            msg: "Invalid User",
          });
          return;
        }

        this.editPage(req.body.id, req.body.page, req._authData)
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

    this.router.get('/:slug',
      (req, res) => {
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

  get routes() {
    return this.router;
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
