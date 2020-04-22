const { ObjectId } = require("mongodb");
const { send401Error, isString, isBoolean } = require("../utilities");

const PageController = require("./PageController");

// PageController Object
// db.type is a string that determines the type of database
// db.client is the MongoDB client
class MongoPageController extends PageController {
  /**
   * Gets a MongoDB Document based on the page slug sent.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @return {Promise} Returns a promise that resolves with an object.
   */
  async getPageBySlug(req, res) {
    if ( !('params' in req)
      || !('slug' in req.params)
    ) {
      const err = "Invalid Page Data Sent";
      send401Error(err, res);
      return Promise.reject(err);
    }

    const findParams = {
      slug: req.params.slug,
    };

    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      findParams.enabled = true;
    }

    const collection = this.db.instance.db("kcms").collection("pages");
    return collection.findOne(findParams)
      .then((result) => {
        if (result) {
          res.status(200).json(result);
          return;
        }

        res.status(404).json();
      });
  }

  /**
   * Retrieves a list of pages. If the user is not logged in, they will receive a
   * list of public pages. If the user is logged in and their user type is a
   * part of the list of editor types, they will get a full list of pages.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   */
  getAllPages(req, res) {
    const findParams = {};

    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      findParams.enabled = true;
    }

    const collection = this.db.instance.db("kcms").collection("pages");
    return collection
      .find(findParams)
      .toArray()
      .then((result) => {
        if (result) {
          res.status(200).json(result);
          return;
        }

        res.status(401).json();
      });
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

  /**
   * Adds a page to the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  addPage(req, res) {
    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send401Error(err, res);
      return Promise.reject(err);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send401Error(pageErr, res);
      return Promise.reject(pageErr);
    }

    const now = new Date().getTime();

    const db = this.db.instance.db("kcms").collection("pages");
    const setData = {
      ...pageData,
      dateAdded: now,
      dateUpdated: now,
    };
    return db.insertOne(setData)
      .then(() => {
        res.status(200).json(setData);
      })
      .catch((err) => {
        const msg = err.msg || err.message;
        res.status(400).json({
          msg,
        });
      });
  }

  /**
   * Edits a page in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  editPage(req, res) {
    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send401Error(err, res);
      return Promise.reject(err);
    }

    if (!('id' in pageData)) {
      const err = "Invalid Page Data. No Id Provided.";
      send401Error(err, res);
      return Promise.reject(err);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send401Error(pageErr, res);
      return Promise.reject(pageErr);
    }

    const now = new Date().getTime();
    const setData = {
      ...pageData,
      dateUpdated: now,
    };
    const { id } = pageData;
    delete setData.id;

    const db = this.db.instance.db("kcms").collection("pages");
    return db.updateOne(
      {
        _id: ObjectId(id),
      },
      {
        $set: setData,
      }
    )
      .then(() => {
        res.status(200).json(setData);
      })
      .catch((err) => {
        console.log(err);
        res.status(401).json({});
      });
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
   * Edits a page in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  deletePage(req, res) {
    if ( !('body' in req)
      || !('page' in req.body)
      || !('id' in req.body.page)
    ) {
      const err = "Invalid Page Data. No Id Provided.";
      send401Error(err, res);
      return Promise.reject(err);
    }

    const db = this.db.instance.db("kcms").collection("pages");
    return db.deleteOne({
      _id: ObjectId(req.body.page.id),
    })
      .then(() => {
        res.status(200).json();
      })
      .catch((err) => {
        console.log(err);
        res.status(401).json();
      });
  }
}

module.exports = MongoPageController;
