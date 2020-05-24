const { Pool }  = require("mysql2");

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

    let query = "SELECT id, enabled, name, slug, content, meta, dateUpdated, dateAdded FROM pages WHERE slug = ?";
    const queryParams = [req.params.slug];

    // This section determines if the user is an editor (someone who can see
    // non-enabled pages). If they are not an editor, enabled is set to true
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
          return 200;
        }

        send404Error(res);
        return 404;
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
        let returnResults = [];
        if (results.length > 0) {
          returnResults = results;
        }

        res.status(200).json(returnResults);
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

    const meta = 'meta' in pageData
      ? pageData.meta
      : {};

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
      JSON.stringify(meta),
      now,
      now,
    ];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && 'affectedRows' in result ) {
          if (result.affectedRows < 1) {
            const error = "Page Not Added";
            send400Error(res, error);
            return error;
          }

          const returnData = {
            name: pageData.name,
            slug: pageData.slug,
            enabled: pageData.enabled,
            content: pageData.content,
            meta,
            dateAdded: now.getTime(),
            dateUpdated: now.getTime(),
          };

          if ('insertId' in result) {
            returnData.id = result.insertId;
          }

          res.status(200).json(returnData);
          return 200;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        if (isObject(err)
          && 'code' in err
          && err.code === 'ER_DUP_ENTRY'
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

    const now = new Date();
    const output = {};

    // We build the query string one part at a time.
    // We let the user only update the portions they want to update
    let query = "UPDATE pages SET ";
    const queryParams = [];

    if ('slug' in pageData) {
      const slugErr = this.checkSlug(pageData.slug);
      // We are only worrying about doing these actions if a slug was passed.
      if (slugErr) {
        send400Error(res, slugErr);
        return Promise.resolve(slugErr);
      }

      query += "slug = ?, ";
      queryParams.push(pageData.slug);
      output.slug = pageData.slug;
    }

    if ('name' in pageData) {
      const nameErr = this.checkName(pageData.name);
      if (nameErr) {
        send400Error(res, nameErr);
        return Promise.resolve(nameErr);
      }

      query += "name = ?, ";
      queryParams.push(pageData.name);
      output.name = pageData.name;
    }

    if ('enabled' in pageData) {
      if (!isBoolean(pageData.enabled)) {
        const err = "Invalid Enabled Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "enabled = ?, ";
      queryParams.push(pageData.enabled);
      output.enabled = pageData.enabled;
    }

    if ('content' in pageData) {
      if (!Array.isArray(pageData.content)) {
        const err = "Invalid Content Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "content = ?, ";
      queryParams.push(JSON.stringify(pageData.content));
      output.content = pageData.content;
    }

    if ('meta' in pageData) {
      if (!isObject(pageData.meta)) {
        const err = "Invalid Meta Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
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
        if (isObject(result) && "affectedRows" in result) {
          if (result.affectedRows > 0) {
            res.status(200).json(output);
            return 200;
          }

          const err = "Page Not Edited";
          send400Error(res, err);
          return err;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        if (isObject(err)
          && 'code' in err
          && err.code === 'ER_DUP_ENTRY'
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

    const query = "DELETE from pages WHERE id = ?";
    const queryParams = [pageData.id];
    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && "affectedRows" in result) {
          if (result.affectedRows > 0) {
            res.status(200).json();
            return 200;
          }

          const error = "No Page Deleted";
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

module.exports = MySQLPageController;
