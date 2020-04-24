/* eslint-disable no-unused-vars */
/* eslint-disable lines-between-class-members */
// These rules are disabled because the PageController class has some empty functions
// with variable parameters that are used as interfaces.
const express = require('express');

const { errorIfTokenDoesNotExist, isString, isBoolean } = require("../utilities");

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

  /**
   * Checks whether a user is in the list of user types that are alowed to
   * add or modify pages.
   * @param {Object} authToken The decoded JWT authorization token
   */
  checkAllowedUsersForSiteMod(authToken) {
    return this.editors.includes(authToken.userType);
  }

  /**
   * Checks the request for page data and extracts the page data from the
   * Express Request object.
   *
   * @param {Object} req Express Request Object
   * @returns {(null|Object)} Returns null if a request exists and null otherwise
   */
  extractPageData(req) {
    if ( !('body' in req)
      || !('page' in req.body)
    ) {
      return null;
    }

    return req.body.page;
  }

  /**
   * Checks that the data that was sent to the addPage or editPage functions are
   * valid.
   *
   * @param {Object} pageData Data sent to the addPage function that's to be added to a document
   * @returns {(null|String)} Returns null if everything is valid or a string containing an error
   */
  checkPageData(pageData) {
    // First we'll check that the required parameters actually exist.
    if (!pageData
      || typeof pageData !== typeof {}
      || !('name' in pageData)
      || !('enabled' in pageData)
      || !('slug' in pageData)
      || !('content' in pageData)
    ) {
      return "Invalid Parameters sent";
    }

    // Then we'll check that the slug is correct:
    if (!this.checkSlug(pageData.slug)) {
      return "Invalid Page Slug";
    }

    if (!isString(pageData.name) || pageData.name.length < 1) {
      return "Invalid Page Name";
    }

    if (!isBoolean(pageData.enabled)) {
      return "Invalid Page Data (Enabled)";
    }

    if (!Array.isArray(pageData.content)) {
      return "Invalid Page Data";
    }

    return null;
  }

  /**
   * Check that the slug provided fulfills the requirements of the application.
   *
   * Slug Requirements:
   * All lower case
   * No spaces or special characters except for hyphen
   *
   * @param {String} slug the slug string to check
   */
  checkSlug(slug) {
    const regex = RegExp(/[^a-z0-9-]+/g);

    // We return not regex.test because if the regular expression is set up to return true if it
    // finds any illegal characters. We want checkSlug to return true if the slug is valid.
    // Thus, if regex.test returns true, the slug is not valid.
    return !regex.test(slug);
  }

  // Interfaces to be defined on a per-database basis
  getPageBySlug(req, res) {}
  getAllPages(req, res) {}
  addPage(req, res) {}
  editPage(req, res) {}
  deletePage(req, res) {}
}

module.exports = PageController;
