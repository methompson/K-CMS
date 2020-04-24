const express = require("express");
const {
  MongoClient,
  findToArray,
  findOne,
  find,
  deleteOne,
  insertOne,
  updateOne,
  collection,
  ObjectId,
} = require("mongodb");

const MongoPageController = require("../../../page/MongoPageController");

const expressJson = jest.fn(() => {});
const status = jest.fn(() => {
  return {
    json: expressJson,
  };
});

const res = {
  status,
};

const errorText = "Test Error";

describe("MongoPageController", () => {
  let db;
  let ph;
  let auth;
  let mpc;
  let req;
  let router;

  beforeEach(() => {
    const mc = new MongoClient();
    db = {
      type: 'mongodb',
      instance: mc,
    };

    ph = { pluginHandler: "pluginHandler" };
    auth = { authenticator: "authenticator" };

    mpc = new MongoPageController(auth, db, ph);
    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    req = {};

    MongoClient.prototype.db.mockClear();

    status.mockClear();
    expressJson.mockClear();

    findOne.mockClear();
    find.mockClear();
    deleteOne.mockClear();
    insertOne.mockClear();
    updateOne.mockClear();
    collection.mockClear();
  });

  test("When a new MongoPageController is instantiated, a database, a pluginHandler, editors and an authenticator are added to the object's data. 5 routes are set", () => {
    mpc = new MongoPageController(auth, db, ph);
    expect(router.get).toHaveBeenCalledTimes(2);
    expect(router.post).toHaveBeenCalledTimes(3);
    expect(mpc.db).toBe(db);
    expect(mpc.pluginHandler).toBe(ph);
    expect(mpc.authenticator).toBe(auth);
  });

  describe("getPageBySlug", () => {

    test("getPageBySlug will return a document if the proper data is passed to it and the slug returns data from the database", (done) => {
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
          expect(result).toBe(doc);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findOne).toHaveBeenCalledTimes(1);
          expect(findOne).toHaveBeenCalledWith(req.params);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith(doc);
          done();
        });
    });

    test("getPageBySlug will perform a search with enabled = true if the user is not in the editor array or there is no _authData in the request", (done) => {
      const doc = {
        test: 'test',
        id: 'id',
      };
      findOne.mockImplementationOnce(() => {
        return Promise.resolve(doc);
      });

      req._authData = {
        userType: 'viewer',
      };

      req.params = {
        slug: 'testSlug',
      };

      mpc.getPageBySlug(req, res)
        .then(() => {
          expect(findOne).toHaveBeenCalledWith({
            ...req.params,
            enabled: true,
          });

          findOne.mockClear();
          delete req._authData.userType;
          return mpc.getPageBySlug(req, res);
        })
        .then(() => {
          expect(findOne).toHaveBeenCalledWith({
            ...req.params,
            enabled: true,
          });

          findOne.mockClear();
          req._authData = null;
          return mpc.getPageBySlug(req, res);
        })
        .then(() => {
          expect(findOne).toHaveBeenCalledWith({
            ...req.params,
            enabled: true,
          });
          done();
        });
    });

    test("getPageBySlug will send a 404 status and an empty object if the document isn't found", (done) => {
      findOne.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      req._authData = {
        userType: 'viewer',
      };

      req.params = {
        slug: 'testSlug',
      };

      mpc.getPageBySlug(req, res)
        .then((result) => {
          expect(result).toBe(404);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(404);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith();
          done();
        });
    });

    test("getPageBySlug will send a 400 error if no parameters are sent", (done) => {
      mpc.getPageBySlug(req, res)
        .catch((err) => {
          expect(err).toBe("Invalid Page Data Sent");
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith({
            error: "Invalid Page Data Sent",
          });
          done();
        });
    });

    test("getPageBySlug will send a 400 error if parameters are sent, but no slug is sent", (done) => {
      req.params = {};
      mpc.getPageBySlug(req, res)
        .catch((err) => {
          expect(err).toBe("Invalid Page Data Sent");
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(400);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith({
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
        .catch((err) => {
          expect(err).toBe(error);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith({
            error: "Database Error",
          });
          done();
        });
    });

  });

  describe("getAllPages", () => {
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
        .then((results) => {
          expect(results).toBe(docs);
          expect(MongoClient.prototype.db).toHaveBeenCalledTimes(1);
          expect(MongoClient.prototype.db).toHaveBeenCalledWith("kcms");
          expect(collection).toHaveBeenCalledTimes(1);
          expect(collection).toHaveBeenCalledWith("pages");
          expect(findToArray).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({});
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
        .then((results) => {
          expect(results).toBe(docs);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({ enabled: true });

          find.mockClear();

          req._authData = {};

          return mpc.getAllPages(req, res);
        })
        .then((results) => {
          expect(results).toBe(docs);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({ enabled: true });

          find.mockClear();

          req._authData = { userType: 'viewer' };

          return mpc.getAllPages(req, res);
        })
        .then((results) => {
          expect(results).toBe(docs);
          expect(find).toHaveBeenCalledTimes(1);
          expect(find).toHaveBeenCalledWith({ enabled: true });

          done();
        });

    });

    test("getAllPages will send a 200 status code and an empty object if no documents exist", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.resolve(null);
      });

      mpc.getAllPages(req, res)
        .then((result) => {
          expect(result).toBe(200);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(200);
          expect(expressJson).toHaveBeenCalledTimes(1);
          expect(expressJson).toHaveBeenCalledWith();
          done();
        });
    });

    test("getAllPages will throw an error if collection.find.toArray throws an error", (done) => {
      findToArray.mockImplementationOnce(() => {
        return Promise.reject(errorText);
      });

      mpc.getAllPages(req, res)
        .catch((err) => {
          expect(err).toBe(errorText);
          expect(status).toHaveBeenCalledTimes(1);
          expect(status).toHaveBeenCalledWith(500);
          expect(expressJson).toHaveBeenCalledWith({ error: "Database Error" });
          expect(expressJson).toHaveBeenCalledTimes(1);
          done();
        });
    });

  });

  describe("addPage", () => {});

  describe("editPage", () => {});

  describe("deletePage", () => {});

});
