const { ObjectId, MongoClient } = require("mongodb");
const {
  endOnError,
  send400Error,
  send401Error,
  send404Error,
  send500Error,
  isObject,
  isBoolean,
  isNumber,
} = require("../utilities");

const BlogController = require("./BlogController");

const blogDataNotProvided = "Blog Post Data Not Provided";

// BlogController Object
// db.type is a string that determines the type of database
// db.client is the MongoDB client
class MongoBlogController extends BlogController {
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
   * Gets a MongoDB Document based on the blog post slug sent.
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

    const findParams = {
      slug: req.params.slug,
    };

    // This section determines if the user is an editor (someone who can see
    // draft or non-public blog posts). If they are not an editor, draft is set to false
    // and public is set to true
    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      findParams.draft = false;
      findParams.public = true;
    }

    const collection = this.db.instance.db(this.db.dbName).collection("blogPosts");
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
   * Retrieves a list of blog posts. If the user is not logged in, they will receive a
   * list of draft and public blog posts. If the user is logged in and their user type is a
   * part of the list of editor types, they will get a full list of blog posts.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise} Returns a promise (for testing purposes)
   */
  getAllBlogPosts(req, res) {
    const findParams = {};

    if ( !('_authData' in req)
      || !req._authData
      || !this.editors.includes(req._authData.userType)
    ) {
      findParams.draft = false;
      findParams.public = true;
    }

    const collection = this.db.instance.db(this.db.dbName).collection("blogPosts");
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
   * Adds a BlogPost to the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  addBlogPost(req, res) {
    if (!this.checkAllowedUsersForBlogMod(req._authData)) {
      send401Error(res, "Access Denied");
      return Promise.resolve("Access Denied");
    }

    const blogPostData = this.extractBlogPostData(req);
    if (!blogPostData) {
      send400Error(res, blogDataNotProvided);
      return Promise.resolve(blogDataNotProvided);
    }

    const blogErr = this.checkBlogData(blogPostData);
    if (blogErr) {
      send400Error(res, blogErr);
      return Promise.resolve(blogErr);
    }

    const now = new Date().getTime();

    const collection = this.db.instance.db(this.db.dbName).collection("blogPosts");
    const newBlogPost = {
      ...blogPostData,
      dateAdded: now,
      dateUpdated: now,
    };

    const output = {
      ...newBlogPost,
    };

    return collection.insertOne(newBlogPost)
      .then((result) => {
        if (isObject(result)
          && 'insertedCount' in result
          && isNumber(result.insertedCount)
        ) {
          if (result.insertedCount > 0) {
            // Assume that if insertedCount exists, insertedId also exists
            output.id = result.insertedId.toString();

            res.status(200).json(output);
            return 200;
          }

          const error = "Blog Post Was Not Added";
          send400Error(res, error);
          return error;
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
          send400Error(res, "Blog Post Slug Already Exists");
        } else {
          send500Error(res, "Error Adding New Blog Post");
        }

        return err;
      });
  }

  /**
   * Edits a Blog Post in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  editBlogPost(req, res) {
    if (!this.checkAllowedUsersForBlogMod(req._authData)) {
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

    if ('slug' in blogPostData) {
      const slugErr = this.checkSlug(blogPostData.slug);
      // We are only worrying about doing these actions if a slug was passed.
      if (slugErr) {
        send400Error(res, slugErr);
        return Promise.resolve(slugErr);
      }
    }

    if ('name' in blogPostData) {
      const nameErr = this.checkName(blogPostData.name);
      if (nameErr) {
        send400Error(res, nameErr);
        return Promise.resolve(nameErr);
      }
    }

    if ('draft' in blogPostData) {
      if (!isBoolean(blogPostData.draft)) {
        const err = "Invalid Draft Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    if ('public' in blogPostData) {
      if (!isBoolean(blogPostData.public)) {
        const err = "Invalid Public Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    if ('content' in blogPostData) {
      if (!Array.isArray(blogPostData.content)) {
        const err = "Invalid Content Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    if ('meta' in blogPostData) {
      if (!isObject(blogPostData.meta)) {
        const err = "Invalid Meta Data Type";
        send400Error(res, err);
        return Promise.resolve(err);
      }
    }

    const now = new Date().getTime();

    // Output contains all of the information passed into
    const setData = {
      ...blogPostData,
      dateUpdated: now,
    };

    // We don't want to save the id to the MongoDB document as 'id', so we extract
    // it out as a variable and remove it from the set data that's being updated
    const { id } = blogPostData;
    delete setData.id;

    const collection = this.db.instance.db(this.db.dbName).collection("blogPosts");
    return collection.updateOne(
      {
        _id: ObjectId(id),
      },
      {
        $set: setData,
      }
    )
      .then((result) => {
        if (isObject(result)
          && 'modifiedCount' in result
          && isNumber(result.modifiedCount)
        ) {
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

          const error = "Blog Post Was Not Updated";
          send400Error(res, error);
          return error;
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
          send400Error(res, "Blog Post Slug Already Exists");
        } else {
          send500Error(res, "Error Editing Blog Post");
        }

        return err;
      });
  }

  /**
   * Deletes a blog post in the database.
   *
   * @param {Object} req Express Request Object
   * @param {Object} res Express Response Object
   * @returns {Promise}
   */
  deleteBlogPost(req, res) {
    if (!this.checkAllowedUsersForBlogMod(req._authData)) {
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

    const collection = this.db.instance.db(this.db.dbName).collection("blogPosts");
    return collection.deleteOne({
      _id: ObjectId(blogPostData.id),
    })
      .then((result) => {
        if (isObject(result)
          && "deletedCount" in result
          && isNumber(result.deletedCount)
        ) {
          if (result.deletedCount > 0) {
            res.status(200).json({
              message: "Blog Post Deleted Successfully",
            });

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

module.exports = MongoBlogController;
