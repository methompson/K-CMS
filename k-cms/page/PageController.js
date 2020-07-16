/* eslint-disable lines-between-class-members */
// These rules are disabled because the PageController class has some empty functions
// with variable parameters that are used as interfaces.
const router = require('express').Router();
const PluginHandler = require("../plugin-handler");

const {
  errorIfTokenDoesNotExist,
  isString,
  isBoolean,
  isObject,
  checkSlug,
} = require("../utilities");

class PageController {
  constructor(pluginHandler) {
    if ((pluginHandler instanceof PluginHandler) === true) {
      this.pluginHandler = pluginHandler;
    } else {
      this.pluginHandler = new PluginHandler();
    }

    this.editors = [
      'editor',
      'admin',
      'superAdmin',
    ];

    this.router = router;

    // We use short closures in these route definitions so that the scope of the class is
    // maintained when running the respective functions. errorIfTokenDoesNotExist doesn't
    // require this scope.
    this.router.post('/add-page', errorIfTokenDoesNotExist, (req, res) => { this.addPage(req, res); });
    this.router.post('/edit-page', errorIfTokenDoesNotExist, (req, res) => { this.editPage(req, res); });
    this.router.post('/delete-page', errorIfTokenDoesNotExist, (req, res) => { this.deletePage(req, res); });

    this.router.get('/get-page/:pageId', (req, res) => { this.getPageById(req, res); });
    this.router.get('/all-pages', (req, res) => { this.getAllPages(req, res); });
    this.router.get('/:slug', (req, res) => { this.getPageBySlug(req, res); });
  }

  get routes() {
    return this.router;
  }

  /**
   * Checks whether a user is in the list of user types that are alowed to
   * add or modify pages.
   *
   * @param {Object} authToken The decoded JWT authorization token
   */
  checkAllowedUsersForSiteMod(authToken) {
    if (!isObject(authToken) || !('userType' in authToken)) {
      return false;
    }

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
    if ( !isObject(req)
      || !('body' in req)
      || !isObject(req.body)
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
    if ( !isObject(pageData)
      || !('name' in pageData)
      || !('enabled' in pageData)
      || !('slug' in pageData)
      || !('content' in pageData)
    ) {
      return "Invalid Parameters Sent";
    }

    // Then we'll check that the slug is correct:
    const nameErr = this.checkName(pageData.name);
    if (nameErr) {
      return nameErr;
    }

    if (!isBoolean(pageData.enabled)) {
      return "Invalid Page Data (Enabled)";
    }

    const slugErr = this.checkSlug(pageData.slug);
    if (slugErr) {
      return slugErr;
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
    return checkSlug(slug);
  }

  checkName(name) {
    if (!isString(name)) {
      return "Invalid Name Type";
    }

    if (name.length < 1 || name.length > 512) {
      return "Invalid Name Length";
    }

    return null;
  }

  // Interfaces to be defined on a per-database basis
  getPageById() {}
  getPageBySlug() {}
  getAllPages() {}
  addPage() {}
  editPage() {}
  deletePage() {}
}

module.exports = PageController;
