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

const BlogController = require("./BlogController");

class MySQLBlogController extends BlogController {
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
   * Gets a MySQL Row based on the blog post slug sent.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @return {Promise} Returns a promise (for testing purposes)
   */
  getBlogPostBySlug(req, res) {
    if ( !('params' in req)
      || !('slug' in req.params)
    ) {
      const err = "Invalid Blog Post Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    let query = "SELECT id, draft, public, name, slug, content, meta, dateUpdated, dateAdded FROM blogPosts WHERE slug = ?";
    const queryParams = [req.params.slug];

    // This section determines if the user is an editor (someone who can see
    // draft or non-public blog posts). If they are not an editor, draft is set to false
    // and public is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      query += " AND draft = ? AND public = ?";
      queryParams.push(false);
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
        send500Error(res, `Database Error, ${err}`);

        return err;
      });
  }

  /**
   * Retrieves a list of blog posts. If the user is not logged in, they will receive a
   * list of public blog posts. If the user is logged in and their user type is a
   * part of the list of editor types, they will get a full list of blog posts.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} Returns a promise (for testing purposes)
   */
  getAllBlogPosts(req, res) {
    let query = "SELECT id, draft, public, name, slug, content, meta, dateUpdated, dateAdded FROM blogPosts";
    const queryParams = [];

    // This section determines if the user is an editor (someone who can see
    // draft or non-public blog posts). If they are not an editor, draft is set to false
    // and public is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      query += " WHERE draft = ? AND public = ?";
      queryParams.push(false);
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
   * Adds a blog post to the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  addBlogPost(req, res) {
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      send401Error(res, "");
      return Promise.resolve("Access Denied");
    }

    const blogPostData = this.extractBlogPostData(req);
    if (!blogPostData) {
      const err = "Invalid Blog Post Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const blogErr = this.checkBlogData(blogPostData);
    if (blogErr) {
      send400Error(res, blogErr);
      return Promise.resolve(blogErr);
    }

    const meta = 'meta' in blogPostData
      ? blogPostData.meta
      : {};

    const now = new Date();

    const query = `
      INSERT INTO blogPosts (
        name,
        slug,
        draft,
        public
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
      blogPostData.name,
      blogPostData.slug,
      blogPostData.draft,
      blogPostData.public,
      JSON.stringify(blogPostData.content),
      JSON.stringify(meta),
      now,
      now,
    ];

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && 'affectedRows' in result ) {
          if (result.affectedRows < 1) {
            const error = "Blog Post Was Not Added";
            send400Error(res, error);
            return error;
          }

          const returnData = {
            name: blogPostData.name,
            slug: blogPostData.slug,
            draft: blogPostData.draft,
            public: blogPostData.public,
            content: blogPostData.content,
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
          send400Error(res, "Blog Post Slug Already Exists");
        } else {
          send500Error(res, "Error Adding New Blog Post");
        }

        return err;
      });
  }

  /**
   * Edits a blog post in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  editBlogPost(req, res) {
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      const err = "Access Denied";
      send401Error(res, err);
      return Promise.resolve(err);
    }

    const blogPostData = this.extractBlogPostData(req);
    if (!blogPostData) {
      const err = "Invalid Blog Post Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    if (!('id' in blogPostData)) {
      const err = "Invalid Blog Post Data. No Id Provided.";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const now = new Date();
    const output = {};

    // We build the query string one part at a time.
    // We let the user only update the portions they want to update
    let query = "UPDATE blogPosts SET ";
    const queryParams = [];

    if ('slug' in blogPostData) {
      const slugErr = this.checkSlug(blogPostData.slug);
      // We are only worrying about doing these actions if a slug was passed.
      if (slugErr) {
        send400Error(res, slugErr);
        return Promise.resolve(slugErr);
      }

      query += "slug = ?, ";
      queryParams.push(blogPostData.slug);
      output.slug = blogPostData.slug;
    }

    if ('name' in blogPostData) {
      const nameErr = this.checkName(blogPostData.name);
      if (nameErr) {
        send400Error(res, nameErr);
        return Promise.resolve(nameErr);
      }

      query += "name = ?, ";
      queryParams.push(blogPostData.name);
      output.name = blogPostData.name;
    }

    if ('draft' in blogPostData) {
      if (!isBoolean(blogPostData.draft)) {
        const err = "Invalid Draft Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "draft = ?, ";
      queryParams.push(blogPostData.draft);
      output.draft = blogPostData.draft;
    }

    if ('public' in blogPostData) {
      if (!isBoolean(blogPostData.public)) {
        const err = "Invalid Public Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "public = ?, ";
      queryParams.push(blogPostData.public);
      output.public = blogPostData.public;
    }

    if ('content' in blogPostData) {
      if (!Array.isArray(blogPostData.content)) {
        const err = "Invalid Content Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "content = ?, ";
      queryParams.push(JSON.stringify(blogPostData.content));
      output.content = blogPostData.content;
    }

    if ('meta' in blogPostData) {
      if (!isObject(blogPostData.meta)) {
        const err = "Invalid Meta Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
      query += "meta = ?, ";
      queryParams.push(JSON.stringify(blogPostData.meta));
      output.meta = blogPostData.meta;
    }

    query += "dateUpdated = ? WHERE id = ?";
    queryParams.push(now);
    queryParams.push(blogPostData.id);

    output.dateUpdated = now;
    output.id = blogPostData.id;

    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && "affectedRows" in result) {
          if (result.affectedRows > 0) {
            res.status(200).json(output);
            return 200;
          }

          const err = "Blog Post Was Not Updated";
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
          send400Error(res, "Blog Post Slug Already Exists");
        } else {
          send500Error(res, "Error Editing Blog Post");
        }

        return err;
      });
  }

  /**
   * Deletes a Blog Post in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  deleteBlogPost(req, res) {
    if (!this.checkAllowedUsersForSiteMod(req._authData)) {
      const err = "Access Denied";
      send401Error(res, err);
      return Promise.resolve(err);
    }

    const blogPostData = this.extractBlogPostData(req);
    if (!blogPostData) {
      const err = "Invalid Blog Post Data Sent";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    if (!('id' in blogPostData)) {
      const err = "Invalid Blog Post Data. No Id Provided.";
      send400Error(res, err);
      return Promise.resolve(err);
    }

    const query = "DELETE from blogPosts WHERE id = ?";
    const queryParams = [blogPostData.id];
    const promisePool = this.db.instance.promise();
    return promisePool.execute(query, queryParams)
      .then(([result]) => {
        if (isObject(result) && "affectedRows" in result) {
          if (result.affectedRows > 0) {
            res.status(200).json();
            return 200;
          }

          const error = "Blog Post Was Not Deleted";
          send400Error(res, error);
          return error;
        }

        const error = "Database Error: Improper Results Returned";
        send500Error(res, error);
        return error;
      })
      .catch((err) => {
        send500Error(res, "Error Deleting Blog Post");

        return err;
      });
  }
}

module.exports = MySQLBlogController;
