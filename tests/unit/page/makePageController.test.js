const { MongoClient } = require("mongodb");

const { makePageController } = require("../../../page");
const MongoPageController = require("../../../page/MongoPageController");
const PluginHandler = require("../../../plugin-handler");

describe("makePageController", () => {
  let db;
  let ph;

  beforeEach(() => {
    db = {
      type: "mongodb",
      instance: new MongoClient(),
    };

    ph = new PluginHandler();
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
