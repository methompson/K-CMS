const express = require("express");

const BlogController = require("../../../../kcms/blog/BlogController");
const PluginHandler = require("../../../../kcms/plugin-handler");

const utilities = require("../../../../kcms/utilities");

const longString = `1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890`;

describe("BlogController", () => {
  let bc;
  let ph;
  let router;
  let req;

  beforeEach(() => {
    ph = new PluginHandler();
    bc = new BlogController(ph);

    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    req = {};
  });

  describe("Instantiation", () => {
    test("When a new BlogController is instantiated, a pluginHandler and editors are added to the object's data. 5 routes are set", () => {
      bc = new BlogController(ph);
      expect(router.get).toHaveBeenCalledTimes(2);
      expect(router.get).toHaveBeenNthCalledWith(1, '/all-blog-posts', expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/:slug', expect.any(Function));

      expect(router.post).toHaveBeenCalledTimes(3);
      expect(router.post).toHaveBeenNthCalledWith(1, '/add-blog-post', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/edit-blog-post', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/delete-blog-post', expect.any(Function), expect.any(Function));

      expect(bc.pluginHandler).toBe(ph);
    });

    test("When a BlogController is instantiated without a PluginHandler or an invalid PluginHandler, a new one will be created", () => {
      bc = new BlogController();
      expect(bc.pluginHandler instanceof PluginHandler).toBe(true);

      const obj = {};
      bc = new BlogController(obj);
      expect(bc.pluginHandler instanceof PluginHandler).toBe(true);
      expect(bc.pluginHandler).not.toBe(obj);
    });

  });

  describe("routes", () => {
    let routes;
    beforeEach(() => {
      routes = bc.routes.getRoutes();
    });

    test("The Router mock will save all of the data that was added in the constructor ", () => {
      expect(Object.keys(routes.post).length).toBe(3);
      expect(Object.keys(routes.get).length).toBe(2);

      expect('/add-blog-post' in routes.post).toBe(true);
      expect('/edit-blog-post' in routes.post).toBe(true);
      expect('/delete-blog-post' in routes.post).toBe(true);

      expect('/all-blog-posts' in routes.get).toBe(true);
      expect('/:slug' in routes.get).toBe(true);
    });

    test("the /add-blog-post route has two functions. The second function runs addBlogPost", () => {
      const addBlogPostSpy = jest.spyOn(bc, 'addBlogPost');

      const route = routes.post['/add-blog-post'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(addBlogPostSpy).toHaveBeenCalledTimes(1);
    });

    test("the /edit-blog-post route has two functions. The second function runs editBlogPost", () => {
      const editBlogPostSpy = jest.spyOn(bc, 'editBlogPost');

      const route = routes.post['/edit-blog-post'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(editBlogPostSpy).toHaveBeenCalledTimes(1);
    });

    test("the /delete-blog-post route has two functions. The second function runs deleteBlogPost", () => {
      const deleteBlogPostSpy = jest.spyOn(bc, 'deleteBlogPost');

      const route = routes.post['/delete-blog-post'];
      req._authData = {};

      expect(route[0] === utilities.errorIfTokenDoesNotExist).toBe(true);

      route[1]();
      expect(deleteBlogPostSpy).toHaveBeenCalledTimes(1);
    });

    test("the /all-blog-posts route has one function and it runs getAllBlogPosts", () => {
      const getBlogSpy = jest.spyOn(bc, 'getAllBlogPosts');

      const route = routes.get['/all-blog-posts'];
      req._authData = {};

      route[0]();
      expect(getBlogSpy).toHaveBeenCalledTimes(1);
    });

    test("the /:slug route has one function and it runs getBlogPostBySlug", () => {
      const getBlogSpy = jest.spyOn(bc, 'getBlogPostBySlug');

      const route = routes.get['/:slug'];
      req._authData = {};

      route[0]();
      expect(getBlogSpy).toHaveBeenCalledTimes(1);
    });

  });

  describe("checkAllowedUsersForBlogMod", () => {
    let authToken;

    beforeEach(() => {
      authToken = {
        userType: '',
      };
    });

    test("checkAllowedUsersForBlogMod will return true when an authToken with a user included in the editors list is passed to the function", () => {
      authToken.userType = "admin";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(true);
      authToken.userType = "superAdmin";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(true);
      authToken.userType = "editor";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(true);
    });

    test("checkAllowedUsersForBlogMod will return false when an authToken with a user not included in the editors list is passed to the function ", () => {
      authToken.userType = "viewer";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(false);
      authToken.userType = "subscriber";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(false);
      authToken.userType = "subAdmin";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(false);
      authToken.userType = "notAdmin";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(false);
      authToken.userType = "notsuperAdmin";
      expect(bc.checkAllowedUsersForBlogMod(authToken)).toBe(false);
    });

    test("checkAllowedUsersForBlogMod will return false when an authToken without a usertype or a non-object is passed to the function ", () => {
      expect(bc.checkAllowedUsersForBlogMod({})).toBe(false);
      expect(bc.checkAllowedUsersForBlogMod(69)).toBe(false);
      expect(bc.checkAllowedUsersForBlogMod("69")).toBe(false);
      expect(bc.checkAllowedUsersForBlogMod(["69"])).toBe(false);
      expect(bc.checkAllowedUsersForBlogMod( () => {} )).toBe(false);
    });
  });

  describe("extractBlogPostData", () => {
    test("extractBlogPostData will return the blogPost data object when it's incuded in the request's body", () => {
      const blogPost = {};
      req.body = {
        blogPost,
      };

      expect(bc.extractBlogPostData(req)).toBe(blogPost);
    });

    test("extractBlogPostData will return null when the request object doesn't have a blogPost or a body", () => {
      expect(bc.extractBlogPostData(req)).toBe(null);

      req.body = 69;
      expect(bc.extractBlogPostData(req)).toBe(null);

      req.body = {};
      expect(bc.extractBlogPostData(req)).toBe(null);
    });

    test("extractBlogPostData will return null when the request argument isn't an object", () => {
      expect(bc.extractBlogPostData(69)).toBe(null);
      expect(bc.extractBlogPostData("69")).toBe(null);
      expect(bc.extractBlogPostData([69])).toBe(null);
      expect(bc.extractBlogPostData(true)).toBe(null);
      expect(bc.extractBlogPostData( () => {} )).toBe(null);
    });
  });

  describe("checkBlogData", () => {
    let bd;
    beforeEach(() => {
      bd = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };
    });

    test("checkBlogData will return null if there are no errors with the blogData object sent to it", () => {
      expect(bc.checkBlogData(bd)).toBe(null);
    });

    test("checkBlogData will return an error if the blogData doesn't include specific keys", () => {
      const pd1 = { ...bd };
      const pd2 = { ...bd };
      const pd3 = { ...bd };
      const pd4 = { ...bd };
      const pd5 = { ...bd };

      delete pd1.name;
      delete pd2.public;
      delete pd3.slug;
      delete pd4.content;
      delete pd5.draft;

      expect(bc.checkBlogData(pd1)).toBe("Invalid Parameters Sent");
      expect(bc.checkBlogData(pd2)).toBe("Invalid Parameters Sent");
      expect(bc.checkBlogData(pd3)).toBe("Invalid Parameters Sent");
      expect(bc.checkBlogData(pd4)).toBe("Invalid Parameters Sent");
      expect(bc.checkBlogData(pd5)).toBe("Invalid Parameters Sent");
    });

    test("checkBlogData will return specific errors if the blogData values aren't the right type", () => {
      const pd1 = { ...bd };
      const pd2 = { ...bd };
      const pd3 = { ...bd };
      const pd4 = { ...bd };
      const pd5 = { ...bd };
      const pd6 = { ...bd };
      const pd7 = { ...bd };
      const pd8 = { ...bd };
      const pd9 = { ...bd };
      const pd10 = { ...bd };

      pd1.name = 69;
      pd2.public = 69;
      pd3.slug = 69;
      pd4.content = 69;
      pd5.name = "";
      pd6.name = longString;
      pd7.slug = "";
      pd8.slug = longString;
      pd9.slug = "~!#";
      pd10.draft = 69;

      expect(bc.checkBlogData(pd1)).toBe("Invalid Name Type");
      expect(bc.checkBlogData(pd2)).toBe("Invalid Blog Post Data (public)");
      expect(bc.checkBlogData(pd3)).toBe("Invalid Slug Type");
      expect(bc.checkBlogData(pd4)).toBe("Invalid Blog Post Data");
      expect(bc.checkBlogData(pd5)).toBe("Invalid Name Length");
      expect(bc.checkBlogData(pd6)).toBe("Invalid Name Length");
      expect(bc.checkBlogData(pd7)).toBe("Invalid Slug Length");
      expect(bc.checkBlogData(pd8)).toBe("Invalid Slug Length");
      expect(bc.checkBlogData(pd9)).toBe("Invalid Characters in Slug");
      expect(bc.checkBlogData(pd10)).toBe("Invalid Blog Post Data (draft)");
    });
  });

  describe("checkSlug", () => {
    test("checkSlug returns true if the values passed to it only include lower case alphabet, numbers and hyphens", () => {
      expect(bc.checkSlug("abcdefghijklmnopqrstuvwxyz1234567890-")).toBe(null);
    });

    test("checkSlug returns an error if the value passed to it includes any character other than lower case alphabet, number and hyphen", () => {
      expect(bc.checkSlug("abc&def")).toBe("Invalid Characters in Slug");
      expect(bc.checkSlug("abc+def")).toBe("Invalid Characters in Slug");
      expect(bc.checkSlug("abc%def")).toBe("Invalid Characters in Slug");
      expect(bc.checkSlug("abc$def")).toBe("Invalid Characters in Slug");
      expect(bc.checkSlug("abc#def")).toBe("Invalid Characters in Slug");
      expect(bc.checkSlug("abc@def")).toBe("Invalid Characters in Slug");
    });

    test("checkSlug returns an error if the value passed to it is not a string or an empty string", () => {
      expect(bc.checkSlug(69)).toBe("Invalid Slug Type");
      expect(bc.checkSlug(true)).toBe("Invalid Slug Type");
      expect(bc.checkSlug([])).toBe("Invalid Slug Type");
      expect(bc.checkSlug({})).toBe("Invalid Slug Type");
      expect(bc.checkSlug(() => {})).toBe("Invalid Slug Type");
    });

    test("checkSlug returns an error if the value passed to it is too short or too long", () => {
      expect(bc.checkSlug("")).toBe("Invalid Slug Length");
      expect(bc.checkSlug(longString)).toBe("Invalid Slug Length");
    });
  });

});
