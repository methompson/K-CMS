const { MongoClient } = require("mongodb");
const { createPool } = require("mysql2");

const { makeUserController } = require("../../../../k-cms/user/index");
const PluginHandler = require("../../../../k-cms/plugin-handler");
const MongoUserController = require("../../../../k-cms/user/MongoUserController");
const MySQLUserController = require("../../../../k-cms/user/MySQLUserController");

const endOnErrorMod = require("../../../../k-cms/utilities/endOnError");

jest.mock("../../../../k-cms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {
    // console.log(err);
  });
  return {
    endOnError,
  };
});

const { endOnError } = endOnErrorMod;

describe("makeUserController", () => {
  let ph;

  beforeEach(() => {
    ph = new PluginHandler();
  });

  describe("mongoDB", () => {
    let db;

    beforeEach(() => {
      const client = new MongoClient("abc", {
        useUnifiedTopology: true,
      });

      db  = {
        type: "mongodb",
        instance: client,
      };
    });

    test("makeUserController will return a new MongoUserController if a db object is passed to makeUserController with mongodb as the type", () => {
      const userController = makeUserController(db, ph);
      expect(userController instanceof MongoUserController).toBe(true);
      expect(userController.db).toBe(db);
      expect(userController.pluginHandler).toBe(ph);
    });

    test("makeUserController will return an instance of a MongoPageController if you pass an appropriate object containing a database", () => {
      let result;

      result = makeUserController(db, {});
      expect(result instanceof MongoUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, 69);
      expect(result instanceof MongoUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, "69");
      expect(result instanceof MongoUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, [69]);
      expect(result instanceof MongoUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, () => {});
      expect(result instanceof MongoUserController).toBe(true);
      expect(result.db).toBe(db);
    });
  });

  describe("mysql", () => {
    let db;
    beforeEach(() => {
      db  = {
        type: "mysql",
        instance: createPool(),
      };
    });

    test("makeUserController will return a new MySQLUserController if a db object is passed to makeUserController with mysql as the type", () => {
      const userController = makeUserController(db, ph);
      expect(userController instanceof MySQLUserController).toBe(true);
      expect(userController.db).toBe(db);
      expect(userController.pluginHandler).toBe(ph);
    });

    test("makeUserController will return an instance of a MySQLPageController if you pass an appropriate object containing a database with inappropriate PluginHandler objects", () => {
      let result;

      result = makeUserController(db, {});
      expect(result instanceof MySQLUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, 69);
      expect(result instanceof MySQLUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, "69");
      expect(result instanceof MySQLUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, [69]);
      expect(result instanceof MySQLUserController).toBe(true);
      expect(result.db).toBe(db);

      result = makeUserController(db, () => {});
      expect(result instanceof MySQLUserController).toBe(true);
      expect(result.db).toBe(db);
    });
  });

  test("makeUserController will return null if db.type does not exist", () => {
    const client = new MongoClient("abc", {
      useUnifiedTopology: true,
    });

    const db  = {
      instance: client,
    };

    const userController = makeUserController(db, ph);

    expect(userController instanceof MongoUserController).toBe(false);
    expect(userController).toBe(null);
  });

  test("makeUserController will return null if db.type is not in the list of acceptable types", () => {
    const client = new MongoClient("abc", {
      useUnifiedTopology: true,
    });

    const db  = {
      instance: client,
      type: "mongo",
    };

    const userController = makeUserController(db, ph);

    expect(userController instanceof MongoUserController).toBe(false);
    expect(userController).toBe(null);
  });

  test("makeUserController will return null if db.type is not in the list of acceptable types", () => {
    const client = new MongoClient("abc", {
      useUnifiedTopology: true,
    });

    const db  = {
      instance: client,
      type: "mongo",
    };

    const userController = makeUserController(db, ph);

    expect(userController instanceof MongoUserController).toBe(false);
    expect(userController).toBe(null);
  });

  test("makeUserController will run endOnError if the db instance is NOT a MongoDB Client", () => {
    endOnError.mockClear();
    const db = {
      instance: {},
      type: "mongodb",
    };

    makeUserController(db, ph);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Database instance is not a MongoDB Client");
  });

  test("makeUserController will return null if there is no db object", () => {
    endOnError.mockClear();
    const userController = makeUserController(null, ph);

    expect(endOnError).toHaveBeenCalledTimes(0);
    expect(userController).toBe(null);
  });

  test("makeUserController will return null endOnError if the db object is missing an instance", () => {
    endOnError.mockClear();
    const db = {
      type: "mongodb",
    };

    makeUserController(db, ph);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Invalid Database Object Sent");
  });
});
