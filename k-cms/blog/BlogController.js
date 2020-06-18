const router = require('express').Router();
const PluginHandler = require("../plugin-handler");

const {
  errorIfTokenDoesNotExist,
  isString,
  isBoolean,
  isObject,
  checkSlug,
} = require("../utilities");

class BlogController {
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
    this.router.post('/add-blog-post', errorIfTokenDoesNotExist, (req, res) => { this.addBlogPost(req, res); });
    this.router.post('/edit-blog-post', errorIfTokenDoesNotExist, (req, res) => { this.editBlogPost(req, res); });
    this.router.post('/delete-blog-post', errorIfTokenDoesNotExist, (req, res) => { this.deleteBlogPost(req, res); });

    this.router.get('/all-blog-posts', (req, res) => { this.getAllBlogPosts(req, res); });
    this.router.get('/:slug', (req, res) => { this.getBlogPostBySlug(req, res); });
  }

  get routes() {
    return this.router;
  }

  /**
   * Checks whether a user is in the list of user types that are alowed to
   * add or modify blog posts.
   *
   * @param {Object} authToken The decoded JWT authorization token
   */
  checkAllowedUsersForBlogMod(authToken) {
    if (!isObject(authToken) || !('userType' in authToken)) {
      return false;
    }

    return this.editors.includes(authToken.userType);
  }

  /**
   * Checks the request for blog post data and extracts the log post data from the
   * Express Request object.
   *
   * @param {Object} req Express Request Object
   * @returns {(null|Object)} Returns null if a request exists and null otherwise
   */
  extractBlogPostData(req) {
    if ( !isObject(req)
      || !('body' in req)
      || !isObject(req.body)
      || !('blogPost' in req.body)
    ) {
      return null;
    }

    return req.body.blogPost;
  }

  checkBlogData(blogData) {
    if (!isObject(blogData)
      || !('name' in blogData)
      || !('slug' in blogData)
      || !('draft' in blogData)
      || !('public' in blogData)
      || !('content' in blogData)
    ) {
      return "Invalid Parameters Sent";
    }

    const nameErr = this.checkName(blogData.name);
    if (nameErr) {
      return nameErr;
    }

    const slugErr = this.checkSlug(blogData.slug);
    if (slugErr) {
      return slugErr;
    }

    if (!isBoolean(blogData.draft)) {
      return "Invalid Blog Post Data (draft)";
    }

    if (!isBoolean(blogData.public)) {
      return "Invalid Blog Post Data (public)";
    }

    return null;
  }

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

  getBlogPostBySlug() {}

  getAllBlogPosts() {}

  addBlogPost() {}

  editBlogPost() {}

  deleteBlogPost() {}
}

module.exports = BlogController;
