const express = require('express');

const pagesController = require('../controllers/pages_edit');

class PageController {
  constructor(authenticator, database) {
    this.db = database;
    this.authenticator = authenticator;
    const authController = this.authenticator.controller;

    this.router = express.Router();
    this.router.get('/', authController.passThrough,  pagesController.doNothing);
    this.router.get('/addtest', (req, res, next) => {
      this.addPage();
      res.status(200).send("<h1>Adding Page</h1>");
    });
  }

  get routes() {
    return this.router;
  }

  getPageBySlug(slug) {}

  getPublicPageList() {}

  getFullPageList() {}

  addPage(pageData = {}) {
    this.db.addPage(pageData);
  }

  editPage(pageData) {}

  deletePage(pageData) {}


}

module.exports = PageController;