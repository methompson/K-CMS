const { ObjectId } = require("mongodb");
const { send400Error, send401Error, send500Error } = require("../utilities");

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
   * @return {Promise} Returns a promise (for testing purposes)
   */
  async getPageBySlug(req, res) {
    if ( !('params' in req)
      || !('slug' in req.params)
    ) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
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
      })
      .catch((err) => {
        console.log(err);
        send500Error(res, "Database Error");
        throw err;
      });
  }

  /**
   * Retrieves a list of pages. If the user is not logged in, they will receive a
   * list of public pages. If the user is logged in and their user type is a
   * part of the list of editor types, they will get a full list of pages.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} Returns a promise (for testing purposes)
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
      })
      .catch((err) => {
        console.log(err);
        send500Error(res, "Database Error");
        throw err;
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
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      console.log("Access Denied");
      send401Error(res, "");
      return Promise.reject("Access Denied");
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.reject(err);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send400Error(res, pageErr);
      return Promise.reject(pageErr);
    }

    console.log(res);

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
        if ( 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Page Slug Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }
        // const msg = err.msg || err.message;
        // send500Error(res, msg);
        throw err;
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
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      send401Error(res, "");
      return Promise.reject("Access Denied");
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.reject(err);
    }

    if (!('id' in pageData)) {
      const err = "Invalid Page Data. No Id Provided.";
      send400Error(res, err);
      return Promise.reject(err);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send400Error(res, pageErr);
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
        if ( 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send401Error(res, "Page Slug Already Exists");
        } else {
          send500Error(res, "Error Adding New User");
        }

        throw err;
      });
  }

  /**
   * Deletes a page in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  deletePage(req, res) {
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      send401Error(res, "");
      return Promise.reject("Access Denied");
    }

    if ( !('body' in req)
      || !('page' in req.body)
      || !('id' in req.body.page)
    ) {
      const err = "Invalid Page Data. No Id Provided.";
      send400Error(res, err);
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
        send500Error(res, "");
        throw err;
      });
  }
}

module.exports = MongoPageController;
