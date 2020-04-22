/* eslint-disable no-unused-vars */
/* eslint-disable lines-between-class-members */
// These rules are disabled because the PageController class has some empty functions
// with variable parameters that are used as interfaces.
const express = require('express');

const { errorIfTokenDoesNotExist } = require("../utilities");

class PageController {
  constructor(authenticator, database, pluginHandler) {
    this.db = database;
    this.pluginHandler = pluginHandler;
    this.authenticator = authenticator;

    this.editors = [
      'editor',
      'admin',
      'superAdmin',
    ];

    this.router = express.Router();

    this.router.post('/add-page', errorIfTokenDoesNotExist, (req, res) => { this.addPage(req, res); });
    this.router.post('/edit-page', errorIfTokenDoesNotExist, (req, res) => { this.editPage(req, res); });
    this.router.post('/delete-page', errorIfTokenDoesNotExist, (req, res) => { this.deletePage(req, res); });

    this.router.get('/all-pages', (req, res) => { this.getAllPages(req, res); });
    this.router.get('/:slug', (req, res) => { this.getPageBySlug(req, res); });
  }

  get pageTypes() {
    return {};
  }

  get routes() {
    return this.router;
  }

  // Interfaces to be defined on a per-database basis
  getPageBySlug(req, res) {}
  getAllPages(req, res) {}
  addPage(req, res) {}
  editPage(req, res) {}
  deletePage(req, res) {}
}

module.exports = PageController;
