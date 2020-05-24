const express = require("express");
const http = require("http");
const { createPool, execute, Pool } = require("mysql2");

const MySQLPageController = require("../../../../k-cms/page/MySQLPageController");
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

describe("MySQLPageController", () => {
  let db;
  let ph;
  let mpc;
  let req;
  let router;

  beforeEach(() => {
    const mp = createPool();
    db = {
      type: "mysql",
      instance: mp,
    };

    ph = new PluginHandler();

    mpc = new MySQLPageController(db, ph);

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
    test("When a new MySQLPageController is instantiated, a database, a pluginHandler and a list of editors are added to the object's data. 5 routes are set", () => {
      mpc = new MySQLPageController(db, ph);
      expect(router.get).toHaveBeenCalledTimes(2);
      expect(router.get).toHaveBeenNthCalledWith(1, '/all-pages', expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/:slug', expect.any(Function));

      expect(router.post).toHaveBeenCalledTimes(3);
      expect(router.post).toHaveBeenNthCalledWith(1, '/add-page', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/edit-page', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/delete-page', expect.any(Function), expect.any(Function));

      expect(mpc.db).toBe(db);
      expect(mpc.pluginHandler).toBe(ph);
    });

    test("When a PageController is instantiated without a database or an improper database, endOnError will be called", () => {
      const endSpy = jest.spyOn(endModule, "endOnError");

      mpc = new MySQLPageController();

      db = {
        instance: {},
        type: "mysql",
      };

      mpc = new MySQLPageController(db);

      expect(endSpy).toHaveBeenCalledTimes(2);
      expect(endSpy).toHaveBeenNthCalledWith(1, "Invalid Database Object Sent");
      expect(endSpy).toHaveBeenNthCalledWith(2, "Database instance is not a MySQL Pool Instance");
    });
  });

  describe("getPageBySlug", () => {
    let sqlQuery;
    beforeEach(() => {
      sqlQuery = "SELECT id, enabled, name, slug, content, meta, dateUpdated, dateAdded FROM pages WHERE slug = ?";
    });

    test("getPageBySlug will send a document if the proper data is passed to it and the slug returns data from the database", (done) => {
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

      mpc.getPageBySlug(req, res)
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

    test("getPageBySlug will perform a search with enabled = true if the user is not in the editor array or there is no _authData in the request", (done) => {
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

      sqlQuery += " AND enabled = ?";
      queryParams.push(true);

      sqlQuery += " LIMIT 1";

      mpc.getPageBySlug(req, res)
        .then((result) => {
          expect(result).toBe(200);

          delete req._authData.userType;
          return mpc.getPageBySlug(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);

          req._authData = null;
          return mpc.getPageBySlug(req, res);
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

    test("getPageBySlug will send a 404 status and an error if the document isn't found", (done) => {
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

      mpc.getPageBySlug(req, res)
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

    test("getPageBySlug will send a 400 error if no parameters are sent", (done) => {
      mpc.getPageBySlug(req, res)
        .then((err) => {
          expect(err).toBe("Invalid Page Data Sent");

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Page Data Sent",
          });
          done();
        });
    });

    test("getPageBySlug will send a 400 error if parameters are sent, but no slug is sent", (done) => {
      req.params = {};
      mpc.getPageBySlug(req, res)
        .then((err) => {
          expect(err).toBe("Invalid Page Data Sent");

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Page Data Sent",
          });
          done();
        });
    });

    test("getPageBySlug will throw an error and send a 500 error if execute throws an error", (done) => {
      req.params = {
        slug: 'testSlug',
      };

      const error = "Test Error 69696969";
      execute.mockImplementationOnce(async () => {
        return Promise.reject(error);
      });

      const queryParams = [req.params.slug];
      sqlQuery += " AND enabled = ?";
      queryParams.push(true);
      sqlQuery += " LIMIT 1";

      mpc.getPageBySlug(req, res)
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

  describe("getAllPages", () => {
    let sqlQuery;
    let queryParams;

    beforeEach(() => {
      sqlQuery = "SELECT id, enabled, name, slug, content, meta, dateUpdated, dateAdded FROM pages";
      queryParams = [];
    });

    test("getAllPages will send a 200 response and send the results of a search from the db collection", (done) => {
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

      mpc.getAllPages(req, res)
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

    test("getAllPages will send a 200 response and results of a search. The actual search will vary if the user is not in the editors list or no auth data exists", (done) => {
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

      sqlQuery += " WHERE enabled = ?";
      queryParams.push(true);

      mpc.getAllPages(req, res)
        .then((result) => {
          expect(result).toBe(200);
          req._authData = {};

          return mpc.getAllPages(req, res);
        })
        .then((result) => {
          expect(result).toBe(200);
          req._authData = { userType: 'viewer' };

          return mpc.getAllPages(req, res);
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

    test("getAllPages will send a 200 status code and an empty array if no documents exist", (done) => {
      execute.mockImplementationOnce(() => {
        const results = [];
        return Promise.resolve([results]);
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
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

    test("getAllPages will throw an error if execute throws an error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
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

  describe("addPage", () => {
    let checkUserSpy;
    let extractSpy;
    let checkPageSpy;

    const sqlQuery = `
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

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
      checkPageSpy = jest.spyOn(mpc, "checkPageData");
    });

    test("addPage will send a 200 response and send the contents of the new page to the user. The function will run execute", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
        meta: {
          testMeta: "abc",
        },
      };

      req.body = {
        page: newPage,
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

      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
            JSON.stringify(newPage.meta),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newPage,
            id: insertId,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("addPage will send a 200 response and send the contents of the new page to the user. The function will run execute. If no meta is provided, an empty object will be added.", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
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

      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newPage,
            meta: {},
            id: insertId,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("addPage will send a 200 response and send the contents of the new page to the user. If no id is included in the result, the data sent to the user will not include the id. The function will run execute.", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 1,
        }];
      });

      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newPage,
            meta: {},
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          done();
        });

    });

    test("If the user isn't allowed to modify the page, addPage will throw an error and send a 401 error", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'viewer',
      };

      mpc.addPage(req, res)
        .then((err) => {
          expect(err).toBe("Access Denied");

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(0);
          expect(checkPageSpy).toHaveBeenCalledTimes(0);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "" });
          done();
        });
    });

    test("If there's no page data included in the request, addPage will throw an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'editor',
      };

      const error = "Invalid Page Data Sent";

      mpc.addPage(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(0);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error });
          done();
        });
    });

    test("If the new page data included in the request doesn't include required data or the data is invalid, addPage will throw an error and send a 400 error", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const pages = [];
      for (let x = 0; x < 11; ++x) {
        pages[x] = { page: { ...newPage } };
      }

      delete pages[0].page.name;
      delete pages[1].page.enabled;
      delete pages[2].page.slug;
      delete pages[3].page.content;
      pages[4].page.slug = "(*&^%";
      pages[5].page.name = "";
      pages[6].page.enabled = "true";
      pages[7].page.content = "true";
      pages[8].page.slug = "";
      pages[9].page.slug = longString;
      pages[10].page.name = longString;

      pages[0].error = "Invalid Parameters sent";
      pages[1].error = "Invalid Parameters sent";
      pages[2].error = "Invalid Parameters sent";
      pages[3].error = "Invalid Parameters sent";
      pages[4].error = "Invalid Characters in Slug";
      pages[5].error = "Invalid Name Length";
      pages[6].error = "Invalid Page Data (Enabled)";
      pages[7].error = "Invalid Page Data";
      pages[8].error = "Invalid Slug Length";
      pages[9].error = "Invalid Slug Length";
      pages[10].error = "Invalid Name Length";


      req._authData = {
        userType: 'admin',
      };

      const requests = [];
      const promises = [];

      for (let x = 0, len = pages.length; x < len; ++x) {
        const { page, error } = pages[x];

        requests[x] = { ...req, body: { page } };
        promises[x] = mpc.addPage(requests[x], res).then((err) => {
          expect(err).toBe(error);
        });
      }

      Promise.all(promises)
        .then(() => {
          const totalRequests = pages.length;

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          expect(checkUserSpy).toHaveBeenCalledTimes(totalRequests);
          expect(extractSpy).toHaveBeenCalledTimes(totalRequests);
          expect(checkPageSpy).toHaveBeenCalledTimes(totalRequests);
          expect(status).toHaveBeenCalledTimes(totalRequests);
          expect(json).toHaveBeenCalledTimes(totalRequests);

          for (let x = 0; x < totalRequests; ++x) {
            const { page, error } = pages[x];
            expect(checkUserSpy).toHaveBeenNthCalledWith(x + 1, req._authData);
            expect(extractSpy).toHaveBeenNthCalledWith(x + 1, requests[x]);
            expect(checkPageSpy).toHaveBeenNthCalledWith(x + 1, page);
            expect(status).toHaveBeenNthCalledWith(x + 1, 400);
            expect(json).toHaveBeenNthCalledWith(x + 1, { error });
          }

          done();
        });
    });

    test("If execute throws an error, addPage will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.addPage(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New Page",
          });
          done();
        });
    });

    test("If execute throws an error indicating the slug already exists, addPage will throw an error and send an HTTP 401 error", (done) => {
      const error = {
        code: "ER_DUP_ENTRY",
      };
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.addPage(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
            JSON.stringify({}),
            expect.any(Date),
            expect.any(Date),
          ]);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Slug Already Exists",
          });

          done();
        });
    });

    test("If execute returns an array without a first parameter that is an object, addPage will send a 500 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([true]);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
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

    test("If Execute returns an array with an object that doesn't include affectedRows in the result, addPage will send a 500 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{}]);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
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

    test("If Execute returns an array with an object that includes affectedRows in the result, but the value is 0, addPage will send a 400 status", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{ affectedRows: 0 }]);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Page Was Not Added";
      mpc.addPage(req, res)
        .then((result) => {
          expect(result).toBe(error);

          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);

          expect(Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledTimes(1);
          expect(execute).toHaveBeenCalledWith(sqlQuery, [
            newPage.name,
            newPage.slug,
            newPage.enabled,
            JSON.stringify(newPage.content),
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

  describe("editPage", () => {
    let sqlQuery;
    let queryParams;
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      sqlQuery = "UPDATE pages SET ";
      queryParams = [];

      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
    });

    test("editPage will send a 200 response and send the contents of the new page to the user. The function will run execute", (done) => {
      const testMeta = { test: "test" };
      const testContent = [
        { test: "test1" },
        { test: "test2" },
      ];

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: testContent,
        meta: testMeta,
      };
      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "meta = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        JSON.stringify(editPage.meta),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
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

      mpc.editPage(req, res)
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
            ...editPage,
            id: req.body.page.id,
            dateUpdated: expect.any(Date),
          });
          done();
        });
    });

    test("If the user isn't allowed to modify the page, editPage will return an error and send a 401 error", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: {
          id: 123,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'viewer',
      };

      mpc.editPage(req, res)
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

    test("If no page data is included, editPage will return an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'editor',
      };

      const error = "Invalid Page Data Sent";

      mpc.editPage(req, res)
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

    test("If no id is included in the page data, editPage will return an error and send a 400 error", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      req.body = {
        page: editPage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Page Data. No Id Provided.";

      mpc.editPage(req, res)
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

    test("If the page data included in the request in invalid, editPage will throw an error and send a 400 error", (done) => {
      const pages = [
        { page: { name: "" }, error: "Invalid Name Length" },
        { page: { name: longString }, error: "Invalid Name Length" },
        { page: { name: null }, error: "Invalid Name Type" },
        { page: { enabled: "true" }, error: "Invalid Enabled Data Type" },
        { page: { enabled: null }, error: "Invalid Enabled Data Type" },
        { page: { slug: "" }, error: "Invalid Slug Length" },
        { page: { slug: "!" }, error: "Invalid Characters in Slug" },
        { page: { slug: longString }, error: "Invalid Slug Length" },
        { page: { slug: null }, error: "Invalid Slug Type" },
        { page: { content: {} }, error: "Invalid Content Data Type" },
        { page: { content: null }, error: "Invalid Content Data Type" },
        { page: { meta: null }, error: "Invalid Meta Data Type" },
        { page: { meta: [] }, error: "Invalid Meta Data Type" },
      ];

      req._authData = {
        userType: 'admin',
      };

      const requests = [];
      const promises = [];
      for (let x = 0, len = pages.length; x < len; ++x) {
        const { page, error } = pages[x];

        requests[x] = { ...req, body: { page: { id: 123, ...page } } };
        promises[x] = mpc.editPage(requests[x], res).then((err) => {
          expect(err).toBe(error);
        });
      }

      Promise.all(promises)
        .then(() => {
          expect(Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(execute).toHaveBeenCalledTimes(0);

          const totalPages = pages.length;

          expect(checkUserSpy).toHaveBeenCalledTimes(totalPages);
          expect(extractSpy).toHaveBeenCalledTimes(totalPages);
          expect(status).toHaveBeenCalledTimes(totalPages);
          expect(json).toHaveBeenCalledTimes(totalPages);
          for (let x = 0, len = totalPages; x < len; ++x) {
            const request = requests[x];
            const { error } = pages[x];

            expect(checkUserSpy).toHaveBeenNthCalledWith(x + 1, req._authData);
            expect(extractSpy).toHaveBeenNthCalledWith(x + 1, request);
            expect(status).toHaveBeenNthCalledWith(x + 1, 400);
            expect(json).toHaveBeenNthCalledWith(x + 1, { error });
          }

          done();
        });
    });

    test("If execute throws an error, editPage will return an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.editPage(req, res)
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
            error: "Error Editing Page",
          });
          done();
        });
    });

    test("If execute throws an error indicating the slug already exists, editPage will return an error and send an HTTP 400 error", (done) => {
      const error = {
        code: "ER_DUP_ENTRY",
      };
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.editPage(req, res)
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
            error: "Page Slug Already Exists",
          });

          done();
        });
    });

    test("If execute returns an array, but the first result is not an object, editPage will return an error and send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([true]);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.editPage(req, res)
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

    test("If execute returns an array and the first result is an object, but the object does not contain affectedRows, editPage will return an error and send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{}]);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.editPage(req, res)
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

    test("If execute returns an array and the first result is an object, but affectedRows is 0, editPage will return an error and send an HTTP 400 error", (done) => {
      execute.mockImplementationOnce(() => {
        return Promise.resolve([{ affectedRows: 0 }]);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const id = 123;

      sqlQuery += "slug = ?, ";
      sqlQuery += "name = ?, ";
      sqlQuery += "enabled = ?, ";
      sqlQuery += "content = ?, ";
      sqlQuery += "dateUpdated = ? WHERE id = ?";

      queryParams = [
        editPage.name,
        editPage.slug,
        editPage.enabled,
        JSON.stringify(editPage.content),
        expect.any(Date),
        id,
      ];

      req.body = {
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Page Was Not Updated";
      mpc.editPage(req, res)
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

  describe("deletePage", () => {

    const id = 123;
    const sqlQuery = "DELETE from pages WHERE id = ?";
    const queryParams = [id];

    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
    });

    test("deletePage will send a 200 response and send the contents of the new page to the user. The function will run execute", (done) => {
      const deletePage = {
        id,
      };

      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 1,
        }];
      });

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.deletePage(req, res)
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

    test("If the user isn't allowed to modify the page, deletePage will send a 400 error", (done) => {
      const deletePage = {
        id: 123,
      };

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'viewer',
      };

      const error = "Access Denied";
      mpc.deletePage(req, res)
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

    test("If no page data is included in the request, deletePage will throw an error and send a 400 error", (done) => {
      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Page Data Sent";

      mpc.deletePage(req, res)
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

    test("If no id is included in the page data, deletePage will throw an error and send a 400 error", (done) => {
      const deletePage = {};

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Invalid Page Data. No Id Provided.";

      mpc.deletePage(req, res)
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

    test("If deleteOne returns an array with no object, editPage will send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [];
      });

      const deletePage = {
        id: 123,
      };

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.deletePage(req, res)
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

    test("If deleteOne returns an array with an object that does not contain affectedRows, editPage will send an HTTP 500 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [{}];
      });

      const deletePage = {
        id: 123,
      };

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Database Error: Improper Results Returned";
      mpc.deletePage(req, res)
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

    test("If deleteOne returns an array with affectedRows of zero, editPage will send an HTTP 400 error", (done) => {
      execute.mockImplementationOnce(async () => {
        return [{
          affectedRows: 0,
        }];
      });

      const deletePage = {
        id: 123,
      };

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      const error = "Page Was Not Deleted";
      mpc.deletePage(req, res)
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

    test("If deleteOne throws an error, editPage will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      execute.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const deletePage = {
        id: 123,
      };

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.deletePage(req, res)
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
            error: "Error Deleting Page",
          });

          done();
        });
    });
  });

});
