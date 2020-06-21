const express = require("express");
const http = require("http");
const { createPool, execute, Pool } = require("mysql2");

const MySQLBlogController = require("../../../../k-cms/blog/MySQLBlogController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

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

const res = new http.ServerResponse();

const errorText = "Test Error";
const longString = `1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890`;

describe("MySQLBlogController", () => {
  let db;
  let ph;
  let mbc;
  let req;
  let router;

  beforeEach(() => {
    const mp = createPool();
    db = {
      type: "mysql",
      instance: mp,
    };

    ph = new PluginHandler();

    mbc = new MySQLBlogController(db, ph);

    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    req = {};

    execute.mockClear();
    createPool.mockClear();
    Pool.prototype.promise.mockClear();

    status.mockClear();
    json.mockClear();
  });

  describe("Instantiation", () => {
    test("When a new MySQLBlogController is instantiated, a database, a pluginHandler and a list of editors are added to the object's data. 5 routes are set", () => {
      mbc = new MySQLBlogController(db, ph);
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

    test("When a BlogController is instantiated without a database or an improper database, endOnError will be called", () => {
      const endSpy = jest.spyOn(endModule, "endOnError");

      mbc = new MySQLBlogController();

      db = {
        instance: {},
        type: "mysql",
      };

      mbc = new MySQLBlogController(db);

      expect(endSpy).toHaveBeenCalledTimes(2);
      expect(endSpy).toHaveBeenNthCalledWith(1, "Invalid Database Object Sent");
      expect(endSpy).toHaveBeenNthCalledWith(2, "Database instance is not a MySQL Pool Instance");
    });
  });

  describe("getBlogPostBySlug", () => {
    let sqlQuery;
    beforeEach(() => {
      sqlQuery = "SELECT id, draft, public, name, slug, content, meta, dateUpdated, dateAdded FROM blogPosts WHERE slug = ?";
    });

    test("getBlogPostBySlug will send a document if the proper data is passed to it and the slug returns data from the database", (done) => {
      const doc = {
        test: 'test',
        id: 'id',
      };

      execute.mockImplementationOnce(async () => {
        const results = [doc];
        return [results];
      });

      req._authData = {
        userType: 'admin',
      };

      req.params = {
        slug: 'testSlug',
      };

      sqlQuery += " LIMIT 1";

      mbc.getBlogPostBySlug(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [req.params.slug]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(doc);
          done();
        });
    });

    test("getBlogPostBySlug will perform a search with public = true & draft = false if the user is not in the editor array or there is no _authData in the request", (done) => {
      const doc = {
        test: 'test',
        id: 'id',
      };
      const results = [doc];
      execute
        .mockImplementationOnce(async () => {
          return [results];
        })
        .mockImplementationOnce(async () => {
          return [results];
        })
        .mockImplementationOnce(async () => {
          return [results];
        });

      req._authData = {
        userType: 'viewer',
      };

      req.params = {
        slug: 'testSlug',
      };

      const queryParams = [req.params.slug];

      sqlQuery += " AND draft = ? AND public = ?";
      queryParams.push(false);
      queryParams.push(true);

      sqlQuery += " LIMIT 1";

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

          expect(execute).toHaveBeenCalledTimes(3);
          expect(execute).toHaveBeenNthCalledWith(1, sqlQuery, queryParams);
          expect(execute).toHaveBeenNthCalledWith(2, sqlQuery, queryParams);
          expect(execute).toHaveBeenNthCalledWith(3, sqlQuery, queryParams);

          done();
        });
    });

    test("getBlogPostBySlug will send a 404 status and an error if the document isn't found", (done) => {
      execute.mockImplementationOnce(async () => {
        const results = [];
        return [results];
      });

      req._authData = {
        userType: 'admin',
      };

      req.params = {
        slug: 'testSlug',
      };

      sqlQuery += " LIMIT 1";

      mbc.getBlogPostBySlug(req, res)
        .then((result) => {
          expect(result).toBe(404);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [req.params.slug]);

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Blog Post Data Sent",
          });
          done();
        });
    });

    test("getBlogPostBySlug will throw an error and send a 500 error if execute throws an error", (done) => {
      req.params = {
        slug: 'testSlug',
      };

      const error = "Test Error 69696969";
      execute.mockImplementationOnce(async () => {
        return Promise.reject(error);
      });

      const queryParams = [req.params.slug];
      sqlQuery += " AND draft = ? AND public = ?";
      queryParams.push(false);
      queryParams.push(true);
      sqlQuery += " LIMIT 1";

      mbc.getBlogPostBySlug(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

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
    let sqlQuery;
    let queryParams;

    beforeEach(() => {
      sqlQuery = "SELECT id, draft, public, name, slug, content, meta, dateUpdated, dateAdded FROM blogPosts";
      queryParams = [];
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

      execute.mockImplementationOnce(async () => {
        return [docs];
      });

      req._authData = {
        userType: 'admin',
      };

      mbc.getAllBlogPosts(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(docs);
          done();
        });
    });

    test("getAllBlogPosts will send a 200 response and results of a search. The actual search will vary if the user is not in the editors list or no auth data exists", (done) => {
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

      execute
        .mockImplementationOnce(async () => {
          return [docs];
        })
        .mockImplementationOnce(async () => {
          return [docs];
        })
        .mockImplementationOnce(async () => {
          return [docs];
        });

      sqlQuery += " WHERE draft = ? AND public = ?";
      queryParams.push(false);
      queryParams.push(true);

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
          expect(Pool.prototype.promise).toHaveBeenCalledTimes(3);

          expect(execute).toHaveBeenCalledTimes(3);
          expect(execute).toHaveBeenNthCalledWith(1, sqlQuery, queryParams);
          expect(execute).toHaveBeenNthCalledWith(2, sqlQuery, queryParams);
          expect(execute).toHaveBeenNthCalledWith(3, sqlQuery, queryParams);

          expect(json).toHaveBeenCalledTimes(3);
          expect(json).toHaveBeenNthCalledWith(1, docs);
          expect(json).toHaveBeenNthCalledWith(2, docs);
          expect(json).toHaveBeenNthCalledWith(3, docs);

          expect(status).toHaveBeenCalledTimes(3);
          expect(status).toHaveBeenNthCalledWith(1, 200);
          expect(status).toHaveBeenNthCalledWith(2, 200);
          expect(status).toHaveBeenNthCalledWith(3, 200);

          done();
        });
    });

    test("getAllBlogPosts will send a 200 status code and an empty array if no documents exist", (done) => {
      execute.mockImplementationOnce(() => {
        const results = [];
        return Promise.resolve([results]);
      });

      req._authData = {
        userType: 'admin',
      };

      mbc.getAllBlogPosts(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith([]);
          done();
        });
    });

    test("getAllBlogPosts will throw an error if execute throws an error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      req._authData = {
        userType: 'admin',
      };

      mbc.getAllBlogPosts(req, res)
        .then((err) => {
          expect(err).toBe(errorText);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

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

    const sqlQuery = `
      INSERT INTO blogPosts (
        name,
        slug,
        draft,
        public,
        content,
        meta,
        dateAdded,
        dateUpdated
      )
      VALUES (
        ?,?,?,?,?,?,?,?
      )
    `;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
      checkBlogSpy = jest.spyOn(mbc, "checkBlogData");
    });

    test("addBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run execute", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
        meta: {
          testMeta: "abc",
        },
      };

      req.body = {
        blogPost: newBlog,
      };
      req._authData = {
        userType: 'admin',
      };

      const insertId = 69;

      execute.mockImplementationOnce(async () => {
        return [{
          insertId,
          affectedRows: 1,
        }];
      });

      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify(newBlog.meta),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newBlog,
            id: insertId,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("addBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run execute. If no meta is provided, an empty object will be added.", (done) => {
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

      const insertId = 69;

      execute.mockImplementationOnce(async () => {
        return [{
          insertId,
          affectedRows: 1,
        }];
      });

      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newBlog,
            meta: {},
            id: insertId,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("addBlogPost will send a 200 response and send the contents of the new blog post to the user. If no id is included in the result, the data sent to the user will not include the id. The function will run execute.", (done) => {
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

      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 1,
        }];
      });

      mbc.addBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(1);
          expect(checkBlogSpy).toHaveBeenCalledWith(newBlog);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newBlog,
            meta: {},
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

      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe("Access Denied");

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(0);
          expect(checkBlogSpy).toHaveBeenCalledTimes(0);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "" });
          done();
        });
    });

    test("If there's no blog post data included in the request, addBlogPost will throw an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'editor',
      };

      const error = "Invalid Blog Post Data Sent";

      mbc.addBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkBlogSpy).toHaveBeenCalledTimes(0);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If the new blog post data included in the request doesn't include required data or the data is invalid, addBlogPost will throw an error and send a 400 error", (done) => {
      const newBlog = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      const blogs = [];
      for (let x = 0; x <= 15; ++x) {
        blogs[x] = { blogPost: { ...newBlog } };
      }

      delete blogs[0].blogPost.name;
      delete blogs[1].blogPost.draft;
      delete blogs[2].blogPost.public;
      delete blogs[3].blogPost.slug;
      delete blogs[4].blogPost.content;

      blogs[5].blogPost.slug = "(*&^%";
      blogs[6].blogPost.slug = "";
      blogs[7].blogPost.slug = longString;
      blogs[8].blogPost.name = longString;
      blogs[9].blogPost.name = "";
      blogs[10].blogPost.draft = "true";
      blogs[11].blogPost.draft = 1;
      blogs[12].blogPost.public = "true";
      blogs[13].blogPost.public = 1;
      blogs[14].blogPost.content = "true";
      blogs[15].blogPost.content = {};

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
      blogs[10].error = "Invalid Blog Post Data (draft)";
      blogs[11].error = "Invalid Blog Post Data (draft)";
      blogs[12].error = "Invalid Blog Post Data (public)";
      blogs[13].error = "Invalid Blog Post Data (public)";
      blogs[14].error = "Invalid Blog Post Data";
      blogs[15].error = "Invalid Blog Post Data";


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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

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

    test("If execute throws an error, addBlogPost will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New Blog Post",
          });
          done();
        });
    });

    test("If execute throws an error indicating the slug already exists, addBlogPost will throw an error and send an HTTP 401 error", (done) => {
      const error = {
        code: "ER_DUP_ENTRY",
      };
      execute.mockImplementationOnce(() => {
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Blog Post Slug Already Exists",
          });

          done();
        });
    });

    test("If execute returns an array without a first parameter that is an object, addBlogPost will send a 500 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([true]);
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });

    });

    test("If Execute returns an array with an object that doesn't include affectedRows in the result, addBlogPost will send a 500 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{}]);
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });

    });

    test("If Execute returns an array with an object that includes affectedRows in the result, but the value is 0, addBlogPost will send a 400 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{ affectedRows: 0 }]);
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newBlog.name,
            newBlog.slug,
            newBlog.draft,
            newBlog.public,
            JSON.stringify(newBlog.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });

    });

  });

  describe("editBlogPost", () => {
    let sqlQuery;
    let queryParams;
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      sqlQuery = "UPDATE blogPosts SET ";
      queryParams = [];

      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
    });

    test("editBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run execute", (done) => {
      const testMeta = { test: "test" };
      const testContent = [
        { test: "test1" },
        { test: "test2" },
      ];

      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: testContent,
        meta: testMeta,
      };
      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "meta = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        JSON.stringify(editBlogPost.meta),
        expect.any(Date),
        id,
      ];

      req.body = {
        blogPost: {
          id,
          ...editBlogPost,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 1,
        }];
      });

      mbc.editBlogPost(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...editBlogPost,
            id: req.body.blogPost.id,
            dateUpdated: expect.any(Date),
          });
          done();
        });
    });

    test("If the user isn't allowed to modify the blog post, editBlogPost will return an error and send a 401 error", (done) => {
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If the blog post data included in the request in invalid, editBlogPost will throw an error and send a 400 error", (done) => {
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
          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

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

    test("If execute throws an error, editBlogPost will return an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editBlogPost = {
        name: "name",
        public: true,
        draft: false,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        expect.any(Date),
        id,
      ];

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
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Editing Blog Post",
          });
          done();
        });
    });

    test("If execute throws an error indicating the slug already exists, editBlogPost will return an error and send an HTTP 400 error", (done) => {
      const error = {
        code: "ER_DUP_ENTRY",
      };
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editBlogPost = {
        name: "name",
        draft: false,
        public: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        expect.any(Date),
        id,
      ];

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
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Blog Post Slug Already Exists",
          });

          done();
        });
    });

    test("If execute returns an array, but the first result is not an object, editBlogPost will return an error and send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([true]);
      });

      const editBlogPost = {
        name: "name",
        draft: false,
        public: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        expect.any(Date),
        id,
      ];

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
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

    test("If execute returns an array and the first result is an object, but the object does not contain affectedRows, editBlogPost will return an error and send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{}]);
      });

      const editBlogPost = {
        name: "name",
        draft: false,
        public: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        expect.any(Date),
        id,
      ];

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
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

    test("If execute returns an array and the first result is an object, but affectedRows is 0, editBlogPost will return an error and send an HTTP 400 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{ affectedRows: 0 }]);
      });

      const editBlogPost = {
        name: "name",
        draft: false,
        public: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "draft = ?, ";
      sqlQuery += "public = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editBlogPost.name,
        editBlogPost.slug,
        editBlogPost.draft,
        editBlogPost.public,
        JSON.stringify(editBlogPost.content),
        expect.any(Date),
        id,
      ];

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
        .then((err) => {
          expect(err).toBe(error);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

  });

  describe("deleteBlogPost", () => {

    const id = 123;
    const sqlQuery = "DELETE from blogPosts WHERE id = ?";
    const queryParams = [id];

    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mbc, "checkAllowedUsersForBlogMod");
      extractSpy = jest.spyOn(mbc, "extractBlogPostData");
    });

    test("deleteBlogPost will send a 200 response and send the contents of the new blog post to the user. The function will run execute", (done) => {
      const deleteBlogPost = {
        id,
      };

      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 1,
        }];
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith();

          done();
        });
    });

    test("If the user isn't allowed to modify the blog post, deleteBlogPost will send a 400 error", (done) => {
      const deleteBlogPost = {
        id: 123,
      };

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If no blog post data is included in the request, deleteBlogPost will throw an error and send a 400 error", (done) => {
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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If no id is included in the blog post data, deleteBlogPost will throw an error and send a 400 error", (done) => {
      const deleteBlogPost = {};

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });

          done();
        });
    });

    test("If deleteOne returns an array with no object, editBlogPost will send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [];
      });

      const deleteBlogPost = {
        id: 123,
      };

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

    test("If deleteOne returns an array with an object that does not contain affectedRows, editBlogPost will send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [{}];
      });

      const deleteBlogPost = {
        id: 123,
      };

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error,
          });

          done();
        });
    });

    test("If deleteOne returns an array with affectedRows of zero, editBlogPost will send an HTTP 400 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 0,
        }];
      });

      const deleteBlogPost = {
        id: 123,
      };

      req.body = {
        blogPost: deleteBlogPost,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Blog Post Was Not Deleted";
      mbc.deleteBlogPost(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If deleteOne throws an error, editBlogPost will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const deleteBlogPost = {
        id: 123,
      };

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

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Deleting Blog Post",
          });

          done();
        });
    });
  });

});
