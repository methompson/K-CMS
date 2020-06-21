const express = require("express");
const http = require("http");
const {
  MongoClient,
  findToArray, // Mock Implementation of toArray in MongoDb
  findOne,
  find,
  deleteOne,
  insertOne,
  updateOne,
  collection,
  ObjectId,
  testId,
  insertedId,
} = require("mongodb");
const endModule = require("../../../../k-cms/utilities/endOnError");

jest.mock("http", () => {
  const json = jest.fn(() => {});
  const status = jest.fn(() => {
    return { json };
  });

  function ServerResponse() {}
  ServerResponse.prototype.status = status;

  return {
    ServerResponse,
    json,
    status,
  };
});

jest.mock("../../../../k-cms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});

  return {
    endOnError,
  };
});

const { json, status } = http;

const MongoBlogController = require("../../../../k-cms/blog/MongoBlogController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

const res = new http.ServerResponse();

const errorText = "Test Error";
const longString = `1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890`;

describe("MongoBlogController", () => {
  let db;
  let ph;
  let mbc;
  let req;
  let router;

  beforeEach(() => {
    const mc = new MongoClient();
    db = {
      type: 'mongodb',
      instance: mc,
    };

    ph = new PluginHandler();

    mbc = new MongoBlogController(db, ph);
    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    req = {};

    MongoClient.prototype.db.mockClear();

    status.mockClear();
    json.mockClear();

    findOne.mockClear();
    find.mockClear();
    deleteOne.mockClear();
    insertOne.mockClear();
    updateOne.mockClear();
    collection.mockClear();
  });

  describe("Instantiation", () => {
    test("When a new MongoBlogController is instantiated, a database, a pluginHandler, editors and an authenticator are added to the object's data. 5 routes are set", () => {
      mbc = new MongoBlogController(db, ph);

      expect(router.get).toHaveBeenCalledTimes(2);
      expect(router.get).toHaveBeenNthCalledWith(1, '/all-blog-posts', expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/:slug', expect.any(Function));

      expect(router.post).toHaveBeenCalledTimes(3);
      expect(router.post).toHaveBeenNthCalledWith(1, '/add-blog-post', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/edit-blog-post', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/delete-blog-post', expect.any(Function), expect.any(Function));

      expect(mbc.db).toBe(db);
      expect(mbc.pluginHandler).toBe(ph);
    });

    test("When a BlogController is instantiated without a database or an improper database, the Node process will exit", () => {
      const endSpy = jest.spyOn(endModule, "endOnError");
      mbc = new MongoBlogController();

      db = {
        instance: {},
        type: "mongodb",
      };

      mbc = new MongoBlogController(db);

      expect(endSpy).toHaveBeenCalledTimes(2);
      expect(endSpy).toHaveBeenNthCalledWith(1, "Invalid Database Object Sent");
      expect(endSpy).toHaveBeenNthCalledWith(2, "Database instance is not a MongoDB Client");
    });
  });

  describe("getBlogPostBySlug", () => {

    test("getBlogPostBySlug will send a document if the proper data is passed to it and the slug returns data from the database", (done) => {
      const doc = {
        test: 'test',
        id: 'id',
      };

      findOne.mockImplementationOnce(() => {
        return Promise.resolve(doc);
      });

      req._authData = {
        userType: 'admin',
      };

      req.params = {
        slug: 'testSlug',
      };

      mbc.getBlogPostBySlug(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith(req.params);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(doc);
          done();
        });
    });

    test("getBlogPostBySlug will perform a search with draft = false and public = true if the user is not in the editor array or there is no _authData in the request", (done) => {
      const doc = {
        test: 'test',
        id: 'id',
      };
      findOne
        .mockImplementationOnce(() => {
          return Promise.resolve(doc);
        })
        .mockImplementationOnce(() => {
          return Promise.resolve(doc);
        })
        .mockImplementationOnce(() => {
          return Promise.resolve(doc);
        });

      req._authData = {
        userType: 'viewer',
      };

      req.params = {
        slug: 'testSlug',
      };

      mbc.getBlogPostBySlug(req, res)
        .then((result) => {
          expect(result).toBe(200);

          delete req._authData.userType;
          return mbc.getBlogPostBySlug(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);

          req._authData = null;
          return mbc.getBlogPostBySlug(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);

          expect(findOne).toHaveBeenCalledTimes(3);
          expect(findOne).toHaveBeenNthCalledWith(1, { ...req.params, draft: false, public: true });
          expect(findOne).toHaveBeenNthCalledWith(2, { ...req.params, draft: false, public: true });
          expect(findOne).toHaveBeenNthCalledWith(3, { ...req.params, draft: false, public: true });
          done();
        });
    });

    test("getBlogPostBySlug will send a 404 status and an error if the document isn't found", (done) => {
      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      req._authData = {
        userType: 'admin',
      };

      req.params = {
        slug: 'testSlug',
      };

      mbc.getBlogPostBySlug(req, res)
        .then((result) => {
          expect(result).toBe(404);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith(req.params);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(404);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Not Found",
          });
          done();
        });
    });

    test("getBlogPostBySlug will send a 400 error if no parameters are sent", (done) => {
      mbc.getBlogPostBySlug(req, res)
        .then((err) => {
          expect(err).toBe("Invalid Blog Post Data Sent");

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Blog Post Data Sent",
          });
          done();
        });
    });

    test("getBlogPostBySlug will send a 400 error if parameters are sent, but no slug is sent", (done) => {
      req.params = {};
      mbc.getBlogPostBySlug(req, res)
        .then((err) => {
          expect(err).toBe("Invalid Blog Post Data Sent");

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Blog Post Data Sent",
          });
          done();
        });
    });

    test("getBlogPostBySlug will throw an error and send a 500 error if findOne throws an error", (done) => {
      req.params = {
        slug: 'testSlug',
      };

      const error = "Test Error 69696969";
      findOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      mbc.getBlogPostBySlug(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({
            ...req.params,
            public: true,
            draft: false,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Database Error",
          });
          done();
        });
    });

  });

  describe("getAllBlogPosts", () => {
    beforeEach(() => {
      findToArray.mockClear();
    });

    test("getAllBlogPosts will send a 200 response and send the results of a search from the db collection", (done) => {
      const docs = [
        {
          test: 'test1',
          content: 'content',
        },
        {
          test: 'test2',
          content: 'content',
        },
      ];

      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(docs);
      });

      req._authData = {
        userType: 'admin',
      };

      mbc.getAllBlogPosts(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({});

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(docs);

          done();
        });
    });

    test("getAllBlogPosts will send a 200 response and results of a search from the db collection. The actual search will vary if the user is not in the editors list or no auth data exists", (done) => {
      const docs = [
        {
          test: 'test1',
          content: 'content',
        },
        {
          test: 'test2',
          content: 'content',
        },
      ];

      findToArray.mockImplementation(() => {
        return Promise.resolve(docs);
      });

      mbc.getAllBlogPosts(req, res)
        .then((result) => {
          expect(result).toBe(200);
          req._authData = {};

          return mbc.getAllBlogPosts(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);
          req._authData = { userType: 'viewer' };

          return mbc.getAllBlogPosts(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);
          expect(find).toHaveBeenCalledTimes(3);
          expect(find).toHaveBeenNthCalledWith(1, { draft: false, public: true });
          expect(find).toHaveBeenNthCalledWith(2, { draft: false, public: true });
          expect(find).toHaveBeenNthCalledWith(3, { draft: false, public: true });

          expect(status).toHaveBeenCalledTimes(3);
          expect(status).toHaveBeenNthCalledWith(1, 200);
          expect(status).toHaveBeenNthCalledWith(2, 200);
          expect(status).toHaveBeenNthCalledWith(3, 200);

          expect(json).toHaveBeenCalledTimes(3);
          expect(json).toHaveBeenNthCalledWith(1, docs);
          expect(json).toHaveBeenNthCalledWith(2, docs);
          expect(json).toHaveBeenNthCalledWith(3, docs);

          done();
        });

    });

    test("getAllBlogPosts will send a 200 status code and an empty array if no documents exist", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      mbc.getAllBlogPosts(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({ draft: false, public: true });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith([]);
          done();
        });
    });

    test("getAllBlogPosts will throw an error if collection.find.toArray throws an error", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      mbc.getAllBlogPosts(req, res)
        .then((err) => {
          expect(err).toBe(errorText);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({ draft: false, public: true });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledWith({ error: "Database Error" });
          expect(json).toHaveBeenCalledTimes(1);
          done();
        });
    });

  });

  describe("addBlogPost", () => {
    let checkUserSpy;
    let extractSpy;
    let checkBlogSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
      checkBlogSpy = jest.spyOn(mbc, "checkBlogData");
    });

    test("addBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run insertOne", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newBlog,
            id: testId,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("If the user isn't allowed to modify the blog post, addBlogPost will throw an error and send a 401 error", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'viewer',
      };

      const error = "Access Denied";
      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(0);
          expect(checkBlogSpy).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If there's no blog post data included in the request, addBlogPost will throw an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'editor',
      };

      const error = "Blog Post Data Not Provided";

      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(0);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If the blogPost data included in the request doesn't include required data or the data is invalid, addBlogPost will throw an error and send a 400 error", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      const blogs = [];
      for (let x = 0; x <= 12; ++x) {
        blogs[x] = { blogPost: { ...newBlog } };
      }

      delete blogs[0].blogPost.name;
      delete blogs[1].blogPost.public;
      delete blogs[2].blogPost.draft;
      delete blogs[3].blogPost.slug;
      delete blogs[4].blogPost.content;
      blogs[5].blogPost.slug = "(*&^%";
      blogs[6].blogPost.slug = "";
      blogs[7].blogPost.slug = longString;
      blogs[8].blogPost.name = "";
      blogs[9].blogPost.name = longString;
      blogs[10].blogPost.public = "true";
      blogs[11].blogPost.draft = "true";
      blogs[12].blogPost.content = "true";

      blogs[0].error = "Invalid Parameters Sent";
      blogs[1].error = "Invalid Parameters Sent";
      blogs[2].error = "Invalid Parameters Sent";
      blogs[3].error = "Invalid Parameters Sent";
      blogs[4].error = "Invalid Parameters Sent";

      blogs[5].error = "Invalid Characters in Slug";
      blogs[6].error = "Invalid Slug Length";
      blogs[7].error = "Invalid Slug Length";
      blogs[8].error = "Invalid Name Length";
      blogs[9].error = "Invalid Name Length";
      blogs[10].error = "Invalid Blog Post Data (public)";
      blogs[11].error = "Invalid Blog Post Data (draft)";
      blogs[12].error = "Invalid Blog Post Data";

      req._authData = {
        userType: 'admin',
      };

      const requests = [];
      const promises = [];

      for (let x = 0, len = blogs.length; x < len; ++x) {
        const { blogPost, error } = blogs[x];

        requests[x] = { ...req, body: { blogPost } };
        promises[x] = mbc.addBlogPost(requests[x], res).then((err) => {
          expect(err).toBe(error);
        });
      }

      Promise.all(promises)
        .then(() => {
          const totalRequests = blogs.length;

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(checkUserSpy).toHaveBeenCalledTimes(totalRequests);
          expect(extractSpy).toHaveBeenCalledTimes(totalRequests);
          expect(checkBlogSpy).toHaveBeenCalledTimes(totalRequests);
          expect(status).toHaveBeenCalledTimes(totalRequests);
          expect(json).toHaveBeenCalledTimes(totalRequests);

          for (let x = 0; x < totalRequests; ++x) {
            const { blogPost, error } = blogs[x];
            expect(checkUserSpy).toHaveBeenNthCalledWith(x + 1, req._authData);
            expect(extractSpy).toHaveBeenNthCalledWith(x + 1, requests[x]);
            expect(checkBlogSpy).toHaveBeenNthCalledWith(x + 1, blogPost);
            expect(status).toHaveBeenNthCalledWith(x + 1, 400);
            expect(json).toHaveBeenNthCalledWith(x + 1, { error });
          }

          done();
        });
    });

    test("If insertOne throws an error, addBlogPost will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New Blog Post",
          });
          done();
        });
    });

    test("If insertOne throws an error indicating the slug already exists, addBlogPost will throw an error and send an HTTP 401 error", (done) => {
      const error = {
        errmsg: "E11000 Error",
      };
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Blog Post Slug Already Exists",
          });
          done();
        });
    });

    test("If insertedCount is 0, addBlogPost will send a 400 response and return an error. The function will run insertOne", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      insertOne.mockImplementationOnce(async () => {
        return {
          insertedCount: 0,
          insertedId,
        };
      });

      const error = "Blog Post Was Not Added";
      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });

    });

    test("If insertedCount is not in the result, addBlogPost will send a 500 response and return an error. The function will run insertOne", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      insertOne.mockImplementationOnce(async () => {
        return {
          insertedId,
        };
      });

      const error = "Database Error: Improper Results Returned";
      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });

    });

    test("If insertedCount is not a number, addBlogPost will send a 500 response and return an error. The function will run insertOne", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      insertOne.mockImplementationOnce(async () => {
        return {
          insertedId,
          insertedCount: true,
        };
      });

      const error = "Database Error: Improper Results Returned";
      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });

    });

    test("If addBlogPost doesn't return an object, addBlogPost will send a 500 response and return an error. The function will run insertOne", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      insertOne.mockImplementationOnce(async () => {
      });

      const error = "Database Error: Improper Results Returned";
      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newBlog,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });

    });

  });

  describe("editBlogPost", () => {
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
    });

    test("editBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run updateOne", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {},
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      const id = 123;

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...editBlogPost,
            id,
            dateUpdated: expect.any(Number),
          });
          done();
        });
    });

    test("If the user isn't allowed to modify the blog, editBlogPost will return an error and send a 401 error", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: {
          id: 123,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'viewer',
      };

      mbc.editBlogPost(req, res)
        .then((err) => {
          expect(err).toBe("Access Denied");

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(0);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: err });

          done();
        });
    });

    test("If no blog post data is included, editBlogPost will return an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'editor',
      };

      const error = "Invalid Blog Post Data Sent";

      mbc.editBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If no id is included in the blog post data, editBlogPost will return an error and send a 400 error", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: editBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Blog Post Data. No Id Provided.";

      mbc.editBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If the blog post data included in the request dones't include required data or the data is invalid, editBlogPost will throw an error and send a 400 error", (done) => {
      const blogs = [
        { blogPost: { name: "" }, error: "Invalid Name Length" },
        { blogPost: { name: longString }, error: "Invalid Name Length" },
        { blogPost: { name: null }, error: "Invalid Name Type" },
        { blogPost: { draft: "true" }, error: "Invalid Draft Data Type" },
        { blogPost: { draft: null }, error: "Invalid Draft Data Type" },
        { blogPost: { public: "true" }, error: "Invalid Public Data Type" },
        { blogPost: { public: null }, error: "Invalid Public Data Type" },
        { blogPost: { slug: "" }, error: "Invalid Slug Length" },
        { blogPost: { slug: "!" }, error: "Invalid Characters in Slug" },
        { blogPost: { slug: longString }, error: "Invalid Slug Length" },
        { blogPost: { slug: null }, error: "Invalid Slug Type" },
        { blogPost: { content: {} }, error: "Invalid Content Data Type" },
        { blogPost: { content: null }, error: "Invalid Content Data Type" },
        { blogPost: { meta: null }, error: "Invalid Meta Data Type" },
        { blogPost: { meta: [] }, error: "Invalid Meta Data Type" },
      ];

      req._authData = {
        userType: 'admin',
      };

      const requests = [];
      const promises = [];
      for (let x = 0, len = blogs.length; x < len; ++x) {
        const { blogPost, error } = blogs[x];

        requests[x] = { ...req, body: { blogPost: { id: 123, ...blogPost } } };
        promises[x] = mbc.editBlogPost(requests[x], res).then((err) => {
          expect(err).toBe(error);
        });
      }

      Promise.all(promises)
        .then(() => {
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          const totalBlogs = blogs.length;

          expect(checkUserSpy).toHaveBeenCalledTimes(totalBlogs);
          expect(extractSpy).toHaveBeenCalledTimes(totalBlogs);
          expect(status).toHaveBeenCalledTimes(totalBlogs);
          expect(json).toHaveBeenCalledTimes(totalBlogs);
          for (let x = 0, len = totalBlogs; x < len; ++x) {
            const request = requests[x];
            const { error } = blogs[x];

            expect(checkUserSpy).toHaveBeenNthCalledWith(x + 1, req._authData);
            expect(extractSpy).toHaveBeenNthCalledWith(x + 1, request);
            expect(status).toHaveBeenNthCalledWith(x + 1, 400);
            expect(json).toHaveBeenNthCalledWith(x + 1, { error });
          }

          done();
        });
    });

    test("If updateOne throws an error, editBlogPost will return an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: {
          id: 123,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.editBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: req.body.blogPost.id,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Editing Blog Post",
          });
          done();
        });
    });

    test("If updateOne throws an error indicating the slug already exists, editBlogPost will return an error and send an HTTP 401 error", (done) => {
      const error = {
        errmsg: "E11000 Error",
      };
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      req.body = {
        blogPost: {
          id: 123,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.editBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: req.body.blogPost.id,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Blog Post Slug Already Exists",
          });

          done();
        });
    });

    test("If modifiedCount is 0, updateOne will send a 400 response and return an error. The function will run updateOne", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {},
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      updateOne.mockImplementationOnce(async () => {
        return {
          modifiedCount: 0,
        };
      });

      const id = 123;

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Blog Post Was Not Updated";
      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If modifiedCount is not a number, updateOne will send a 400 response and return an error. The function will run updateOne", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {},
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      updateOne.mockImplementationOnce(async () => {
        return {
          modifiedCount: true,
        };
      });

      const id = 123;

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If modifiedCount is not in the result, updateOne will send a 500 response and return an error. The function will run updateOne", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {},
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      updateOne.mockImplementationOnce(async () => {
        return {};
      });

      const id = 123;

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If updateOne doesn't return an object, updateOne will send a 500 response and return an error. The function will run updateOne", (done) => {
      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {},
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      updateOne.mockImplementationOnce(async () => {});

      const id = 123;

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editBlogPost,
                dateUpdated: expect.any(Number),
              },
            }
          );

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

  });

  describe("deleteBlogPost", () => {
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
    });

    test("deleteBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run insertOne", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.deleteBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            message: "Blog Post Deleted Successfully",
          });

          done();
        });
    });

    test("If the user isn't allowed to modify the blog post, deleteBlogPost will throw an error and send a 400 error", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'viewer',
      };

      const error = "Access Denied";
      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(0);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If no blog post data is included, deleteBlogPost will throw an error and send a 400 error", (done) => {
      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Blog Post Data Sent";

      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If no id is included in the blog post data, deleteBlogPost will throw an error and send a 400 error", (done) => {
      const deleteBlogPost = {};

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Blog Post Data. No Id Provided.";

      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If deleteOne throws an error, editBlogPost will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      deleteOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const deleteBlogPost = {
        id: 123,
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Deleting Blog Post",
          });

          done();
        });
    });

    test("If deletedCount is 0, deleteBlogPost will send a 400 response return an error. The function will run deleteOne", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      deleteOne.mockImplementationOnce(async () => {
        return { deletedCount: 0 };
      });

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Blog Post Was Not Deleted";
      mbc.deleteBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If deletedCount is not a number, deleteBlogPost will send a 500 response return an error. The function will run deleteOne", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      deleteOne.mockImplementationOnce(async () => {
        return {
          deletedCount: true,
        };
      });

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.deleteBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If deletedCount is not in the result, deleteBlogPost will send a 500 response return an error. The function will run deleteOne", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      deleteOne.mockImplementationOnce(async () => {
        return {};
      });

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.deleteBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If deletedBlog doesn't return an object, deleteBlogPost will send a 500 response return an error. The function will run deleteOne", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

      deleteOne.mockImplementationOnce(async () => {});

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.deleteBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("blogPosts");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

  });

});
