const { ObjectId, MongoClient } = require("mongodb");
const {
  endOnError,
  send400Error,
  send401Error,
  send404Error,
  send500Error,
  isObject,
  isBoolean,
} = require("../utilities");

const PageController = require("./PageController");

const pageDataNotProvided = "Page Data Not Provided";

// PageController Object
// db.type is a string that determines the type of database
// db.client is the MongoDB client
class MongoPageController extends PageController {
  constructor(database, pluginHandler) {
    super(pluginHandler);

    if ( !isObject(database)
      || !('instance' in database)
    ) {
      endOnError("Invalid Database Object Sent");
      return;
    }

    if (!(database.instance instanceof MongoClient)) {
      endOnError("Database instance is not a MongoDB Client");
      return;
    }

    this.db = database;
  }

  /**
   * Gets a MongoDB Document based on the page slug sent.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @return {Promise} Returns a promise (for testing purposes)
   */
  getPageBySlug(req, res) {
    if ( !('params' in req)
      || !('slug' in req.params)
    ) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const findParams = {
      slug: req.params.slug,
    };

    // This section determines if the user is an editor (someone who can see
    // non-enabled pages). If they are not an admin, enabled is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      findParams.enabled = true;
    }

    const collection = this.db.instance.db("kcms").collection("pages");
    return collection.findOne(findParams)
      .then((result) => {
        if (!result) {
          send404Error(res);
          return 404;
        }

        res.status(200).json(result);
        return 200;
      })
      .catch((err) => {
        send500Error(res, "Database Error");

        return err;
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
      .then((results) => {

        if (results) {
          res.status(200).json(results);
        } else {
          res.status(200).json([]);
        }

        return 200;
      })
      .catch((err) => {
        send500Error(res, "Database Error");

        return err;
      });
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
      send401Error(res, "Access Denied");
      return Promise.resolve("Access Denied");
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      send400Error(res, pageDataNotProvided);
      return Promise.resolve(pageDataNotProvided);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send400Error(res, pageErr);
      return Promise.resolve(pageErr);
    }

    const now = new Date().getTime();

    const collection = this.db.instance.db("kcms").collection("pages");
    const newPage = {
      ...pageData,
      dateAdded: now,
      dateUpdated: now,
    };

    const output = {
      ...newPage,
    };

    return collection.insertOne(newPage)
      .then((result) => {
        if (isObject(result) && 'insertedCount' in result ) {
          if (result.insertedCount > 0) {
            // Assume that if insertedCount exists, insertedId also exists
            output.id = result.insertedId.toString();

            res.status(200).json(output);
            return 200;
          }

          if (result.insertedCount > 0) {
            const error = "Page Not Added";
            send400Error(res, error);
            return error;
          }
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        if ( isObject(err)
          && 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send400Error(res, "Page Slug Already Exists");
        } else {
          send500Error(res, "Error Adding New Page");
        }

        return err;
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
      const err = "Access Denied";
      send401Error(res, err);
      return Promise.resolve(err);
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    if (!('id' in pageData)) {
      const err = "Invalid Page Data. No Id Provided.";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    if ('slug' in pageData) {
      const slugErr = this.checkSlug(pageData.slug);
      // We are only worrying about doing these actions if a slug was passed.
      if (slugErr) {
        send400Error(res, slugErr);
        return Promise.resolve(slugErr);
      }
    }

    if ('name' in pageData) {
      const nameErr = this.checkName(pageData.name);
      if (nameErr) {
        send400Error(res, nameErr);
        return Promise.resolve(nameErr);
      }
    }

    if ('enabled' in pageData) {
      if (!isBoolean(pageData.enabled)) {
        const err = "Invalid Enabled Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    if ('content' in pageData) {
      if (!Array.isArray(pageData.content)) {
        const err = "Invalid Content Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    if ('meta' in pageData) {
      if (!isObject(pageData.meta)) {
        const err = "Invalid Meta Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    const now = new Date().getTime();

    // Output contains all of the information passed into
    const setData = {
      ...pageData,
      dateUpdated: now,
    };

    // We don't want to save the id to the MongoDB document as 'id', so we extract
    // it out as a variable and remove it from the set data that's being updated
    const { id } = pageData;
    delete setData.id;

    const collection = this.db.instance.db("kcms").collection("pages");
    return collection.updateOne(
      {
        _id: ObjectId(id),
      },
      {
        $set: setData,
      }
    )
      .then((result) => {
        if (isObject(result) && 'modifiedCount' in result ) {
          if (result.modifiedCount > 0) {
            const output = {
              ...setData,
              id,
            };

            // _id is automatically added by MongoDB, this line Removes the _id
            // key to prevent confusion and make it similar to the MySQL controller.
            delete output._id;
            res.status(200).json(output);
            return 200;
          }

          if (result.modifiedCount === 0) {
            const error = "Page Not Updated";
            send400Error(res, error);
            return error;
          }
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        if ( isObject(err)
          && 'errmsg' in err
          && err.errmsg.indexOf("E11000" >= 0)
        ) {
          send400Error(res, "Page Slug Already Exists");
        } else {
          send500Error(res, "Error Editing Page");
        }

        return err;
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
      const err = "Access Denied";
      send401Error(res, err);
      return Promise.resolve(err);
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    if (!('id' in pageData)) {
      const err = "Invalid Page Data. No Id Provided.";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const collection = this.db.instance.db("kcms").collection("pages");
    return collection.deleteOne({
      _id: ObjectId(pageData.id),
    })
      .then((result) => {
        if (result.deletedCount > 0) {
          res.status(200).json({
            message: "Page Deleted Successfully",
          });

          return 200;
        }

        if (result.deletedCount === 0) {
          const error = "Page Not Deleted";
          send400Error(res, error);
          return error;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        send500Error(res, "Error Deleting Page");
        return err;
      });
  }
}

module.exports = MongoPageController;
