const express = require("express");
const http = require("http");
const mysql = require("mysql2");

const MySQLPageController = require("../../../../k-cms/page/MySQLPageController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

const utilities = require("../../../../k-cms/utilities");
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

describe("MySQLPageController", () => {
  let db;
  let ph;
  let mpc;
  let req;
  let router;

  beforeEach(() => {
    const mp = mysql.createPool();
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

    mysql.execute.mockClear();
    mysql.createPool.mockClear();
    mysql.Pool.prototype.promise.mockClear();

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

      mysql.execute.mockImplementationOnce(async () => {
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
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.slug]);

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
      mysql.execute.mockImplementationOnce(async () => {
        const results = [doc];
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
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          mysql.execute.mockClear();
          delete req._authData.userType;
          return mpc.getPageBySlug(req, res);
        })
        .then(() => {
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          mysql.execute.mockClear();
          req._authData = null;
          return mpc.getPageBySlug(req, res);
        })
        .then(() => {
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          done();
        });
    });

    test("getPageBySlug will send a 404 status and an empty object if the document isn't found", (done) => {
      mysql.execute.mockImplementationOnce(async () => {
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
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, [req.params.slug]);

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
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(err).toBe("Invalid Page Data Sent");
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
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(0);
          expect(mysql.execute).toHaveBeenCalledTimes(0);

          expect(err).toBe("Invalid Page Data Sent");
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
      mysql.execute.mockImplementationOnce(async () => {
        return Promise.reject(error);
      });

      mpc.getPageBySlug(req, res)
        .then((err) => {
          expect(err).toBe(error);
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

      mysql.execute.mockImplementationOnce(async () => {
        return [docs];
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith(docs);
          done();
        });
    });

    test("getAllPages will send a 200 response and results of a search from the db collection. The actual search will vary if the user is not in the editors list or no auth data exists", (done) => {
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

      mysql.execute.mockImplementationOnce(async () => {
        return [docs];
      });

      sqlQuery += " WHERE enabled = ?";
      queryParams.push(true);

      mpc.getAllPages(req, res)
        .then(() => {
          req._authData = {};

          return mpc.getAllPages(req, res);
        })
        .then(() => {
          req._authData = { userType: 'viewer' };

          return mpc.getAllPages(req, res);
        })
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(3);

          expect(mysql.execute).toHaveBeenCalledTimes(3);
          expect(mysql.execute).toHaveBeenNthCalledWith(1, sqlQuery, queryParams);
          expect(mysql.execute).toHaveBeenNthCalledWith(2, sqlQuery, queryParams);
          expect(mysql.execute).toHaveBeenNthCalledWith(3, sqlQuery, queryParams);

          done();
        });

    });

    test("getAllPages will send a 200 status code and an empty object if no documents exist", (done) => {
      mysql.execute.mockImplementationOnce(() => {
        const results = [];
        return Promise.resolve([results]);
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
        .then(() => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith();
          done();
        });
    });

    test("getAllPages will throw an error if mysql.execute throws an error", (done) => {
      mysql.execute.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
        .then((err) => {
          expect(mysql.Pool.prototype.promise).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledTimes(1);
          expect(mysql.execute).toHaveBeenCalledWith(sqlQuery, queryParams);

          expect(err).toBe(errorText);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledWith({ error: "Database Error" });
          expect(json).toHaveBeenCalledTimes(1);
          done();
        });
    });

  });

  describe("addPage", () => {

    test("addPage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req.body = {
        page: newPage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.addPage(req, res)
        .then(() => {
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(newPage);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newPage,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...newPage,
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

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "" });
          done();
        });
    });

    test("If there's no page data included in the request, addPage will throw an error and send a 400 error", (done) => {
      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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

    test("If the page data included in the request doesn't include required data or the data is invalid, addPage will throw an error and send a 400 error", (done) => {
      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const newPage1 = { ...newPage };
      const newPage2 = { ...newPage };
      const newPage3 = { ...newPage };
      const newPage4 = { ...newPage };
      const newPage5 = { ...newPage };
      const newPage6 = { ...newPage };
      const newPage7 = { ...newPage };
      const newPage8 = { ...newPage };

      delete newPage1.name;
      delete newPage2.enabled;
      delete newPage3.slug;
      delete newPage4.content;
      newPage5.slug = "(*&^%";
      newPage6.name = "";
      newPage7.enabled = "true";
      newPage8.content = "true";

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req._authData = {
        userType: 'admin',
      };

      const req1 = { ...req, body: { page: newPage1 } };
      const req2 = { ...req, body: { page: newPage2 } };
      const req3 = { ...req, body: { page: newPage3 } };
      const req4 = { ...req, body: { page: newPage4 } };
      const req5 = { ...req, body: { page: newPage5 } };
      const req6 = { ...req, body: { page: newPage6 } };
      const req7 = { ...req, body: { page: newPage7 } };
      const req8 = { ...req, body: { page: newPage8 } };

      const p1 = mpc.addPage(req1, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p2 = mpc.addPage(req2, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p3 = mpc.addPage(req3, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p4 = mpc.addPage(req4, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p5 = mpc.addPage(req5, res).then((err) => { expect(err).toBe("Invalid Page Slug"); });
      const p6 = mpc.addPage(req6, res).then((err) => { expect(err).toBe("Invalid Page Name"); });
      const p7 = mpc.addPage(req7, res).then((err) => { expect(err).toBe("Invalid Page Data (Enabled)"); });
      const p8 = mpc.addPage(req8, res).then((err) => { expect(err).toBe("Invalid Page Data"); });

      Promise.all([p1, p2, p3, p4, p5, p6, p7, p8])
        .then(() => {
          expect(checkUserSpy).toHaveBeenCalledTimes(8);
          expect(checkUserSpy).toHaveBeenNthCalledWith(1, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(2, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(3, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(4, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(5, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(6, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(7, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(8, req._authData);

          expect(extractSpy).toHaveBeenCalledTimes(8);
          expect(extractSpy).toHaveBeenNthCalledWith(1, req1);
          expect(extractSpy).toHaveBeenNthCalledWith(2, req2);
          expect(extractSpy).toHaveBeenNthCalledWith(3, req3);
          expect(extractSpy).toHaveBeenNthCalledWith(4, req4);
          expect(extractSpy).toHaveBeenNthCalledWith(5, req5);
          expect(extractSpy).toHaveBeenNthCalledWith(6, req6);
          expect(extractSpy).toHaveBeenNthCalledWith(7, req7);
          expect(extractSpy).toHaveBeenNthCalledWith(8, req8);

          expect(checkPageSpy).toHaveBeenCalledTimes(8);
          expect(checkPageSpy).toHaveBeenNthCalledWith(1, newPage1);
          expect(checkPageSpy).toHaveBeenNthCalledWith(2, newPage2);
          expect(checkPageSpy).toHaveBeenNthCalledWith(3, newPage3);
          expect(checkPageSpy).toHaveBeenNthCalledWith(4, newPage4);
          expect(checkPageSpy).toHaveBeenNthCalledWith(5, newPage5);
          expect(checkPageSpy).toHaveBeenNthCalledWith(6, newPage6);
          expect(checkPageSpy).toHaveBeenNthCalledWith(7, newPage7);
          expect(checkPageSpy).toHaveBeenNthCalledWith(8, newPage8);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(8);
          expect(status).toHaveBeenNthCalledWith(1, 400);
          expect(status).toHaveBeenNthCalledWith(2, 400);
          expect(status).toHaveBeenNthCalledWith(3, 400);
          expect(status).toHaveBeenNthCalledWith(4, 400);
          expect(status).toHaveBeenNthCalledWith(5, 400);
          expect(status).toHaveBeenNthCalledWith(6, 400);
          expect(status).toHaveBeenNthCalledWith(7, 400);
          expect(status).toHaveBeenNthCalledWith(8, 400);

          expect(json).toHaveBeenCalledTimes(8);
          expect(json).toHaveBeenNthCalledWith(1, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(2, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(3, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(4, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(5, { error: "Invalid Page Slug" });
          expect(json).toHaveBeenNthCalledWith(6, { error: "Invalid Page Name" });
          expect(json).toHaveBeenNthCalledWith(7, { error: "Invalid Page Data (Enabled)" });
          expect(json).toHaveBeenNthCalledWith(8, { error: "Invalid Page Data" });
          done();
        });
    });

    test("If insertOne throws an error, addPage will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newPage,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Adding New Page",
          });
          done();
        });
    });

    test("If insertOne throws an error indicating the slug already exists, addPage will throw an error and send an HTTP 401 error", (done) => {
      const error = {
        errmsg: "E11000 Error",
      };
      insertOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const newPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(insertOne).toHaveBeenCalledTimes(1);
          expect(insertOne).toHaveBeenCalledWith({
            ...newPage,
            dateAdded: expect.any(Number),
            dateUpdated: expect.any(Number),
          });
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Slug Already Exists",
          });
          done();
        });
    });

  });

  describe("editPage", () => {

    test("editPage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req.body = {
        page: {
          id: 123,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.editPage(req, res)
        .then(() => {
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(req.body.page);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: testObjectId,
            },
            {
              $set: {
                ...editPage,
                dateUpdated: expect.any(Number),
              },
            }
          );
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            ...editPage,
            dateUpdated: expect.any(Number),
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

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(checkPageSpy).toHaveBeenCalledTimes(0);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({ error: "" });
          done();
        });
    });

    test("If no page data is included, editPage will return an error and send a 400 error", (done) => {
      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(checkPageSpy).toHaveBeenCalledTimes(0);
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

    test("If no id is included in the page data, editPage will return an error and send a 400 error", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

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
          expect(checkPageSpy).toHaveBeenCalledTimes(0);
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

    test("If the page data included in the request dones't include required data or the data is invalid, editPage will throw an error and send a 400 error", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const editPage1 = { ...editPage };
      const editPage2 = { ...editPage };
      const editPage3 = { ...editPage };
      const editPage4 = { ...editPage };
      const editPage5 = { ...editPage };
      const editPage6 = { ...editPage };
      const editPage7 = { ...editPage };
      const editPage8 = { ...editPage };

      delete editPage1.name;
      delete editPage2.enabled;
      delete editPage3.slug;
      delete editPage4.content;
      editPage5.slug = "(*&^%";
      editPage6.name = "";
      editPage7.enabled = "true";
      editPage8.content = "true";

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req.body = {
        page: {
          id: 123,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      const req1 = { ...req, body: { page: { id: 123, ...editPage1 } } };
      const req2 = { ...req, body: { page: { id: 123, ...editPage2 } } };
      const req3 = { ...req, body: { page: { id: 123, ...editPage3 } } };
      const req4 = { ...req, body: { page: { id: 123, ...editPage4 } } };
      const req5 = { ...req, body: { page: { id: 123, ...editPage5 } } };
      const req6 = { ...req, body: { page: { id: 123, ...editPage6 } } };
      const req7 = { ...req, body: { page: { id: 123, ...editPage7 } } };
      const req8 = { ...req, body: { page: { id: 123, ...editPage8 } } };

      const p1 = mpc.editPage(req1, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p2 = mpc.editPage(req2, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p3 = mpc.editPage(req3, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p4 = mpc.editPage(req4, res).then((err) => { expect(err).toBe("Invalid Parameters sent"); });
      const p5 = mpc.editPage(req5, res).then((err) => { expect(err).toBe("Invalid Page Slug"); });
      const p6 = mpc.editPage(req6, res).then((err) => { expect(err).toBe("Invalid Page Name"); });
      const p7 = mpc.editPage(req7, res).then((err) => { expect(err).toBe("Invalid Page Data (Enabled)"); });
      const p8 = mpc.editPage(req8, res).then((err) => { expect(err).toBe("Invalid Page Data"); });

      Promise.all([p1, p2, p3, p4, p5, p6, p7, p8])
        .then(() => {
          expect(checkUserSpy).toHaveBeenCalledTimes(8);
          expect(checkUserSpy).toHaveBeenNthCalledWith(1, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(2, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(3, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(4, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(5, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(6, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(7, req._authData);
          expect(checkUserSpy).toHaveBeenNthCalledWith(8, req._authData);

          expect(extractSpy).toHaveBeenCalledTimes(8);
          expect(extractSpy).toHaveBeenNthCalledWith(1, req1);
          expect(extractSpy).toHaveBeenNthCalledWith(2, req2);
          expect(extractSpy).toHaveBeenNthCalledWith(3, req3);
          expect(extractSpy).toHaveBeenNthCalledWith(4, req4);
          expect(extractSpy).toHaveBeenNthCalledWith(5, req5);
          expect(extractSpy).toHaveBeenNthCalledWith(6, req6);
          expect(extractSpy).toHaveBeenNthCalledWith(7, req7);
          expect(extractSpy).toHaveBeenNthCalledWith(8, req8);

          expect(checkPageSpy).toHaveBeenCalledTimes(8);
          expect(checkPageSpy).toHaveBeenNthCalledWith(1, req1.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(2, req2.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(3, req3.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(4, req4.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(5, req5.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(6, req6.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(7, req7.body.page);
          expect(checkPageSpy).toHaveBeenNthCalledWith(8, req8.body.page);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(8);
          expect(status).toHaveBeenNthCalledWith(1, 400);
          expect(status).toHaveBeenNthCalledWith(2, 400);
          expect(status).toHaveBeenNthCalledWith(3, 400);
          expect(status).toHaveBeenNthCalledWith(4, 400);
          expect(status).toHaveBeenNthCalledWith(5, 400);
          expect(status).toHaveBeenNthCalledWith(6, 400);
          expect(status).toHaveBeenNthCalledWith(7, 400);
          expect(status).toHaveBeenNthCalledWith(8, 400);

          expect(json).toHaveBeenCalledTimes(8);
          expect(json).toHaveBeenNthCalledWith(1, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(2, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(3, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(4, { error: "Invalid Parameters sent" });
          expect(json).toHaveBeenNthCalledWith(5, { error: "Invalid Page Slug" });
          expect(json).toHaveBeenNthCalledWith(6, { error: "Invalid Page Name" });
          expect(json).toHaveBeenNthCalledWith(7, { error: "Invalid Page Data (Enabled)" });
          expect(json).toHaveBeenNthCalledWith(8, { error: "Invalid Page Data" });
          done();
        });
    });

    test("If updateOne throws an error, editPage will return an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req.body = {
        page: {
          id: 123,
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
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(req.body.page);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: req.body.page.id,
            },
            {
              $set: {
                ...editPage,
                dateUpdated: expect.any(Number),
              },
            }
          );
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Error Editing Page",
          });
          done();
        });
    });

    test("If updateOne throws an error indicating the slug already exists, editPage will return an error and send an HTTP 401 error", (done) => {
      const error = {
        errmsg: "E11000 Error",
      };
      updateOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const editPage = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");
      const checkPageSpy = jest.spyOn(mpc, "checkPageData");

      req.body = {
        page: {
          id: 123,
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
          expect(checkPageSpy).toHaveBeenCalledTimes(1);
          expect(checkPageSpy).toHaveBeenCalledWith(req.body.page);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(updateOne).toHaveBeenCalledTimes(1);
          expect(updateOne).toHaveBeenCalledWith(
            {
              _id: req.body.page.id,
            },
            {
              $set: {
                ...editPage,
                dateUpdated: expect.any(Number),
              },
            }
          );
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(401);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Slug Already Exists",
          });
          done();
        });
    });

  });

  describe("deletePage", () => {

    test("deletePage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
      const deletePage = {
        id: 123,
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.deletePage(req, res)
        .then(() => {
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith();
          done();
        });
    });

    test("If the user isn't allowed to modify the page, deletePage will throw an error and send a 400 error", (done) => {
      const deletePage = {
        id: 123,
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

      req.body = {
        page: deletePage,
      };
      req._authData = {
        userType: 'viewer',
      };

      mpc.deletePage(req, res)
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
          expect(json).toHaveBeenCalledWith({ error: "" });
          done();
        });
    });

    test("If no page data is included, deletePage will throw an error and send a 400 error", (done) => {
      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

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

    test("If no id is included in the page data, deletePage will throw an error and send a 400 error", (done) => {
      const deletePage = {};

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

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

    test("If deleteOne throws an error, editPage will throw an error and send an HTTP 500 error", (done) => {
      const error = "test error";
      deleteOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      const deletePage = {
        id: 123,
      };

      const checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      const extractSpy = jest.spyOn(mpc, "extractPageData");

      const testObjectId = 69696969;
      ObjectId.mockImplementationOnce(() => {
        return testObjectId;
      });

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
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(deleteOne).toHaveBeenCalledTimes(1);
          expect(deleteOne).toHaveBeenCalledWith({
            _id: testObjectId,
          });
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
