const { MongoClient } = require("mongodb");

const { makeUserController } = require("../../../../k-cms/user/index");
const PluginHandler = require("../../../../k-cms/plugin-handler");
const MongoUserController = require("../../../../k-cms/user/MongoUserController");

const endOnErrorMod = require("../../../../k-cms/utilities/endOnError");

jest.mock("../../../../k-cms/utilities/endOnError", () => {
  const endOnError = jest.fn((err) => {
    console.log(err);
  });
  return {
    endOnError,
  };
});

const { endOnError } = endOnErrorMod;

describe("makeUserController", () => {
  test("makeUserController will return a new MongoUserController if a db object is passed to makeUserController with mongodb as the type", () => {
    const client = new MongoClient("abc", {
      useUnifiedTopology: true,
    });

    const db  = {
      type: "mongodb",
      instance: client,
    };

    const ph = new PluginHandler();

    const userController = makeUserController(db, ph);
    expect(userController instanceof MongoUserController).toBe(true);
    expect(userController.db).toBe(db);
    expect(userController.pluginHandler).toBe(ph);
  });

  test("makeUserController will return null if db.type does not exist", () => {
    const client = new MongoClient("abc", {
      useUnifiedTopology: true,
    });

    const db  = {
      instance: client,
    };

    const ph = new PluginHandler();
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

    const ph = new PluginHandler();
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

    const ph = new PluginHandler();
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

    const ph = new PluginHandler();
    makeUserController(db, ph);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Database instance is not a MongoDB Client");
  });

  test("makeUserController will return null if there is no db object", () => {
    endOnError.mockClear();
    const ph = new PluginHandler();
    const userController = makeUserController(null, ph);

    expect(endOnError).toHaveBeenCalledTimes(0);
    expect(userController).toBe(null);
  });

  test("makeUserController will return null endOnError if the db object is missing an instance", () => {
    endOnError.mockClear();
    const db = {
      type: "mongodb",
    };

    const ph = new PluginHandler();
    makeUserController(db, ph);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Invalid Database Object Sent");
  });
});
