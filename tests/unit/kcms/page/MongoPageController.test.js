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

const MongoPageController = require("../../../../k-cms/page/MongoPageController");
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

describe("MongoPageController", () => {
  let db;
  let ph;
  let mpc;
  let req;
  let router;

  beforeEach(() => {
    const mc = new MongoClient();
    db = {
      type: 'mongodb',
      instance: mc,
    };

    ph = new PluginHandler();

    mpc = new MongoPageController(db, ph);
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
    test("When a new MongoPageController is instantiated, a database, a pluginHandler, editors and an authenticator are added to the object's data. 5 routes are set", () => {
      mpc = new MongoPageController(db, ph);

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

    test("When a PageController is instantiated without a database or an improper database, the Node process will exit", () => {
      const endSpy = jest.spyOn(endModule, "endOnError");
      mpc = new MongoPageController();

      db = {
        instance: {},
        type: "mongodb",
      };

      mpc = new MongoPageController(db);

      expect(endSpy).toHaveBeenCalledTimes(2);
      expect(endSpy).toHaveBeenNthCalledWith(1, "Invalid Database Object Sent");
      expect(endSpy).toHaveBeenNthCalledWith(2, "Database instance is not a MongoDB Client");
    });
  });

  describe("getPageBySlug", () => {

    test("getPageBySlug will send a document if the proper data is passed to it and the slug returns data from the database", (done) => {
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

      mpc.getPageBySlug(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith(req.params);

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

          expect(findOne).toHaveBeenCalledTimes(3);
          expect(findOne).toHaveBeenNthCalledWith(1, { ...req.params, enabled: true });
          expect(findOne).toHaveBeenNthCalledWith(2, { ...req.params, enabled: true });
          expect(findOne).toHaveBeenNthCalledWith(3, { ...req.params, enabled: true });
          done();
        });
    });

    test("getPageBySlug will send a 404 status and an error if the document isn't found", (done) => {
      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      req._authData = {
        userType: 'admin',
      };

      req.params = {
        slug: 'testSlug',
      };

      mpc.getPageBySlug(req, res)
        .then((result) => {
          expect(result).toBe(404);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
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

    test("getPageBySlug will send a 400 error if no parameters are sent", (done) => {
      mpc.getPageBySlug(req, res)
        .then((err) => {
          expect(err).toBe("Invalid Page Data Sent");

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(findOne).toHaveBeenCalledTimes(0);

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Invalid Page Data Sent",
          });
          done();
        });
    });

    test("getPageBySlug will throw an error and send a 500 error if findOne throws an error", (done) => {
      req.params = {
        slug: 'testSlug',
      };

      const error = "Test Error 69696969";
      findOne.mockImplementationOnce(() => {
        return Promise.reject(error);
      });

      mpc.getPageBySlug(req, res)
        .then((err) => {
          expect(err).toBe(error);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith({
            ...req.params,
            enabled: true,
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

  describe("getAllPages", () => {
    beforeEach(() => {
      findToArray.mockClear();
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

      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(docs);
      });

      req._authData = {
        userType: 'admin',
      };

      mpc.getAllPages(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
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

      findToArray.mockImplementation(() => {
        return Promise.resolve(docs);
      });

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
          expect(find).toHaveBeenCalledTimes(3);
          expect(find).toHaveBeenNthCalledWith(1, { enabled: true });
          expect(find).toHaveBeenNthCalledWith(2, { enabled: true });
          expect(find).toHaveBeenNthCalledWith(3, { enabled: true });

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

    test("getAllPages will send a 200 status code and an empty array if no documents exist", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      mpc.getAllPages(req, res)
        .then((result) => {
          expect(result).toBe(200);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({
            enabled: true,
          });

          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith([]);
          done();
        });
    });

    test("getAllPages will throw an error if collection.find.toArray throws an error", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      mpc.getAllPages(req, res)
        .then((err) => {
          expect(err).toBe(errorText);

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({
            enabled: true,
          });

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

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
      checkPageSpy = jest.spyOn(mpc, "checkPageData");
    });

    test("addPage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
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
        .then((result) => {
          expect(result).toBe(200);

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
            id: testId,
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

          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

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
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Slug Already Exists",
          });
          done();
        });
    });

  });

  describe("editPage", () => {
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
    });

    test("editPage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
      const editPage = {
        name: "name",
        enabled: true,
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
        page: {
          id,
          ...editPage,
        },
      };
      req._authData = {
        userType: 'admin',
      };

      mpc.editPage(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(checkUserSpy).toHaveBeenCalledTimes(1);
          expect(checkUserSpy).toHaveBeenCalledWith(req._authData);
          expect(extractSpy).toHaveBeenCalledTimes(1);
          expect(extractSpy).toHaveBeenCalledWith(req);
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
            id,
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
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(0);
          expect(collection).toHaveBeenCalledTimes(0);
          expect(insertOne).toHaveBeenCalledTimes(0);

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
          expect(status).toHaveBeenCalledWith(400);
          expect(json).toHaveBeenCalledTimes(1);
          expect(json).toHaveBeenCalledWith({
            error: "Page Slug Already Exists",
          });

          done();
        });
    });

  });

  describe("deletePage", () => {
    let checkUserSpy;
    let extractSpy;

    beforeEach(() => {
      checkUserSpy = jest.spyOn(mpc, "checkAllowedUsersForSiteMod");
      extractSpy = jest.spyOn(mpc, "extractPageData");
    });

    test("deletePage will send a 200 response and send the contents of the new page to the user. The function will run insertOne", (done) => {
      const deletePage = {
        id: 123,
      };

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
        .then((result) => {
          expect(result).toBe(200);

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

      const error = "Access Denied";
      mpc.deletePage(req, res)
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

    test("If no page data is included, deletePage will throw an error and send a 400 error", (done) => {
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
