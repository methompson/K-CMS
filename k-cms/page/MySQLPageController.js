const { Pool }  = require("mysql2");

const {
  endOnError,
  send400Error,
  send401Error,
  send404Error,
  send500Error,
  isObject,
} = require("../utilities");

const PageController = require("./PageController");

class MySQLPageController extends PageController {
  constructor(database, pluginHandler) {
    super(pluginHandler);

    if ( !isObject(database)
      || !('instance' in database)
    ) {
      endOnError("Invalid Database Object Sent");
      return;
    }

    if (!(database.instance instanceof Pool)) {
      endOnError("Database instance is not a MySQL Pool Instance");
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

    const { slug } = req.params;

    let query = "SELECT id, enabled, name, slug, content, meta, dateUpdated, dateAdded FROM pages WHERE slug = ?";
    const queryParams = [slug];

    // This section determines if the user is an editor (someone who can see
    // non-enabled pages). If they are not an admin, enabled is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      query += " AND enabled = ?";
      queryParams.push(true);
    }

    query += " LIMIT 1";

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([results]) => {
        if (results.length > 0) {
          res.status(200).json(results[0]);
          return;
        }

        send404Error(res);
      })
      .catch((err) => {
        console.log(err);
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
    let query = "SELECT id, enabled, name, slug, content, meta, dateUpdated, dateAdded FROM pages";
    const queryParams = [];

    // This section determines if the user is an editor (someone who can see
    // non-enabled pages). If they are not an admin, enabled is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      query += " WHERE enabled = ?";
      queryParams.push(true);
    }

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([results]) => {
        if (results.length > 0) {
          res.status(200).json(results);
          return;
        }

        res.status(200).json();
      })
      .catch((err) => {
        console.log(err);
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
      console.log("Access Denied");
      send401Error(res, "");
      return Promise.resolve("Access Denied");
    }

    const pageData = this.extractPageData(req);
    if (!pageData) {
      const err = "Invalid Page Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send400Error(res, pageErr);
      return Promise.resolve(pageErr);
    }

    const now = new Date();

    const query = `
      INSERT INTO pages (
        name,
        slug,
        enabled,
        content,
        meta,
        dateAdded,
        dateUpdated
      )
      VALUES (
        ?,?,?,?,?,?,?
      )
    `;

    const queryParams = [
      pageData.name,
      pageData.slug,
      pageData.enabled,
      JSON.stringify(pageData.content),
      JSON.stringify(pageData.meta),
      now,
      now,
    ];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        console.log(result);
        if ('affectedRows' in result && result.affectedRows === 1) {
          const returnData = {
            name: pageData.name,
            slug: pageData.slug,
            enabled: pageData.enabled,
            content: pageData.content,
            meta: {},
            dateAdded: now.getTime(),
            dateUpdated: now.getTime(),
          };

          if ('insertId' in result) {
            returnData.id = result.insertId;
          }

          res.status(200).json(returnData);
        } else {
          send401Error(res, "No Page Added");
        }
      })
      .catch((err) => {
        if (isObject(err) && 'code' in err) {
          if (err.code === 'ER_DUP_ENTRY') {
            send400Error(res, "Page Slug Already Exists");
            return;
          }
        }

        send500Error(res, "Error Adding New Page");
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
      console.log("Access Denied");
      send401Error(res, "");
      return Promise.resolve("Access Denied");
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

    const pageErr = this.checkPageData(pageData);
    if (pageErr) {
      send400Error(res, pageErr);
      return Promise.resolve(pageErr);
    }

    const now = new Date();
    const output = {};

    // We build the query string one part at a time.
    // We let the user only update the portions they want to update
    let query = "UPDATE pages SET ";
    const queryParams = [];

    if ('name' in pageData) {
      query += "name = ?, ";
      queryParams.push(pageData.name);
      output.name = pageData.name;
    }
    if ('slug' in pageData) {
      query += "slug = ?, ";
      queryParams.push(pageData.slug);
      output.slug = pageData.slug;
    }
    if ('enabled' in pageData) {
      query += "enabled = ?, ";
      queryParams.push(pageData.enabled);
      output.enabled = pageData.enabled;
    }
    if ('content' in pageData) {
      query += "content = ?, ";
      queryParams.push(JSON.stringify(pageData.content));
      output.content = pageData.content;
    }
    if ('meta' in pageData) {
      query += "meta = ?, ";
      queryParams.push(JSON.stringify(pageData.meta));
      output.meta = pageData.meta;
    }

    query += "dateUpdated = ? WHERE id = ?";
    queryParams.push(now);
    queryParams.push(pageData.id);

    output.dateUpdated = now;
    output.id = pageData.id;

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result)
          && "affectedRows" in result
          && result.affectedRows > 0
        ) {
          res.status(200).json(output);
          return;
        }

        send400Error(res, "No Page Edited");
      })
      .catch((err) => {
        if (isObject(err) && 'code' in err) {
          if (err.code === 'ER_DUP_ENTRY') {
            send400Error(res, "Page Slug Already Exists");
            return;
          }
        }
        send500Error(res, "Error Editing Page");
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
      console.log("Access Denied");
      send401Error(res, "");
      return Promise.resolve("Access Denied");
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

    const query = "DELETE from pages WHERE id = ?";
    const queryParams = [pageData.id];
    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && "affectedRows" in result) {
          if (result.affectedRows > 0) {
            res.status(200).json();
          } else {
            send400Error(res, "No Page Deleted");
          }

          return;
        }

        throw "No Results Returned";
      })
      .catch((err) => {
        console.log(err);
        send500Error(res, "Error Editing Page");
      });
  }
}

module.exports = MySQLPageController;
