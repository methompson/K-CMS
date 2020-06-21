const { MongoClient } = require("mongodb");
const { createPool } = require("mysql2");

const { makeBlogController } = require("../../../../k-cms/blog");
const MongoBlogController = require("../../../../k-cms/blog/MongoBlogController");
const MySQLBlogController = require("../../../../k-cms/blog/MySQLBlogController");
const PluginHandler = require("../../../../k-cms/plugin-handler");

describe("makeBlogController", () => {
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

    test("makeBlogController will return an instance of a MongoBlogController if you pass an appropriate object containing a database and a PluginHandler object", () => {
      const result = makeBlogController(db, ph);
      expect(result.pluginHandler).toBe(ph);
      expect(result instanceof MongoBlogController).toBe(true);
      expect(result.db).toBe(db);
    });

    test("makeBlogController will return an instance of a MongoBlogController if you pass an appropriate object containing a database", () => {
      let result;

      result = makeBlogController(db, {});
      expect(result instanceof MongoBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, 69);
      expect(result instanceof MongoBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, "69");
      expect(result instanceof MongoBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, [69]);
      expect(result instanceof MongoBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, () => {});
      expect(result instanceof MongoBlogController).toBe(true);
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

    test("makeBlogController will return an instance of a MySQLBlogController if you pass an appropriate object containing a database and a PluginHandler object", () => {
      const result = makeBlogController(db, ph);
      expect(result.pluginHandler).toBe(ph);
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);
    });

    test("makeBlogController will return an instance of a MySQLBlogController if you pass an appropriate object containing a database with inappropriate PluginHandler objects", () => {
      let result;

      result = makeBlogController(db, {});
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, 69);
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, "69");
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, [69]);
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);

      result = makeBlogController(db, () => {});
      expect(result instanceof MySQLBlogController).toBe(true);
      expect(result.db).toBe(db);
    });
  });

  test("makeBlogController will return null if the database object has no type nor is an object", () => {
    let result;

    result = makeBlogController(69);
    expect(result).toBe(null);

    result = makeBlogController("69");
    expect(result).toBe(null);

    result = makeBlogController([69]);
    expect(result).toBe(null);

    result = makeBlogController(true);
    expect(result).toBe(null);

    result = makeBlogController(() => {});
    expect(result).toBe(null);

    result = makeBlogController({
      type: "none",
    });

    result = makeBlogController({});

  });
});
