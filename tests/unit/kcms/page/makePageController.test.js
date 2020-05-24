const { MongoClient } = require("mongodb");
const { createPool } = require("mysql2");

const { makePageController } = require("../../../../k-cms/page");
const MongoPageController = require("../../../../k-cms/page/MongoPageController");
const MySQLPageController = require("../../../../k-cms/page/MySQLPageController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

describe("makePageController", () => {
  let ph;

  beforeEach(() => {
    ph = new PluginHandler();
  });

  describe("mongoDB", () => {
    let db;

    beforeEach(() => {
      db = {
        type: "mongodb",
        instance: new MongoClient(),
      };
    });

    test("makePageController will return an instance of a MongoPageController if you pass an appropriate object containing a database and a PluginHandler object", () => {
      const result = makePageController(db, ph);
      expect(result.pluginHandler).toBe(ph);
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);
    });

    test("makePageController will return an instance of a MongoPageController if you pass an appropriate object containing a database", () => {
      let result;

      result = makePageController(db, {});
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, 69);
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, "69");
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, [69]);
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, () => {});
      expect(result instanceof MongoPageController).toBe(true);
      expect(result.db).toBe(db);
    });
  });

  describe("mysql", () => {
    let db;

    beforeEach(() => {
      db = {
        type: "mysql",
        instance: createPool(),
      };
    });

    test("makePageController will return an instance of a MySQLPageController if you pass an appropriate object containing a database and a PluginHandler object", () => {
      const result = makePageController(db, ph);
      expect(result.pluginHandler).toBe(ph);
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);
    });

    test("makePageController will return an instance of a MySQLPageController if you pass an appropriate object containing a database", () => {
      let result;

      result = makePageController(db, {});
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, 69);
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, "69");
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, [69]);
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);

      result = makePageController(db, () => {});
      expect(result instanceof MySQLPageController).toBe(true);
      expect(result.db).toBe(db);
    });
  });

  test("makePageController will return null if the database object has no type nor is an object", () => {
    let result;

    result = makePageController(69);
    expect(result).toBe(null);

    result = makePageController("69");
    expect(result).toBe(null);

    result = makePageController([69]);
    expect(result).toBe(null);

    result = makePageController(true);
    expect(result).toBe(null);

    result = makePageController(() => {});
    expect(result).toBe(null);

    result = makePageController({
      type: "none",
    });

    result = makePageController({});

  });
});
