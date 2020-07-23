const { makeDatabaseClient } = require("../../../../kcms/database");
const getMongoDbModule = require("../../../../kcms/database/getMongoDb");
const getMySQLDbModule = require("../../../../kcms/database/getMySQLDb");
const endOnErrorMod = require("../../../../kcms/utilities/endOnError");

jest.mock("../../../../kcms/database/getMongoDb", () => {
  const client = {};
  const getMongo = jest.fn(() => { return client; });
  return {
    getMongoDb: getMongo,
    client,
  };
});

jest.mock("../../../../kcms/database/getMySQLdb", () => {
  const client = {};
  const getMysql = jest.fn(() => { return client; });
  return {
    getMySQLDb: getMysql,
    client,
  };
});

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

const { endOnError } = endOnErrorMod;
const { getMongoDb } = getMongoDbModule;
const { getMySQLDb } = getMySQLDbModule;

describe("database", () => {
  const dbName = "testDbName";

  describe("makeDatabaseClient", () => {

    beforeEach(() => {
      getMySQLDb.mockClear();
    });

    test("When passing proper mongodb data to makeDatabaseClient, a mongoDb client will be returned in an object", () => {
      getMongoDb.mockClear();
      const dbOpt = {
        mongodb: {},
      };

      const expectation = {
        dbName: "kcms",
        type: 'mongodb',
        instance: getMongoDbModule.client,
      };
      const result = makeDatabaseClient(dbOpt);

      expect(result).toStrictEqual(expectation);
      expect(getMongoDb).toHaveBeenCalledWith(dbOpt.mongodb);
      expect(getMongoDb).toHaveBeenCalledTimes(1);
    });

    test("When passing proper mongodb data to makeDatabaseClient with a database name, a mongoDb client will be returned in an object", () => {
      getMongoDb.mockClear();
      const dbOpt = {
        mongodb: {
          databaseName: dbName,
        },
      };

      const expectation = {
        dbName,
        type: 'mongodb',
        instance: getMongoDbModule.client,
      };
      const result = makeDatabaseClient(dbOpt);

      expect(result).toStrictEqual(expectation);
      expect(getMongoDb).toHaveBeenCalledWith(dbOpt.mongodb);
      expect(getMongoDb).toHaveBeenCalledTimes(1);
    });

    test("When passing acceptable data to getMySQLDb, a mysql client will be returned in an object and makeDatabaseClient will return an object containing information about the database plus an instance", () => {
      getMongoDb.mockClear();
      const dbOpt = {
        mysql: {
          host: "",
          user: "",
          password: "",
        },
      };

      const expectation = {
        dbName: "kcms",
        type: 'mysql',
        instance: getMySQLDbModule.client,
      };
      const result = makeDatabaseClient(dbOpt);

      expect(result).toMatchObject(expectation);
      expect(getMySQLDb).toHaveBeenCalledWith(dbOpt.mysql, "kcms");
      expect(getMySQLDb).toHaveBeenCalledTimes(1);
    });

    test("When passing acceptable data to getMySQLDb with a dbName, a mysql client will be returned in an object and makeDatabaseClient will return an object containing information about the database plus an instance", () => {
      getMongoDb.mockClear();
      const dbOpt = {
        mysql: {
          host: "",
          user: "",
          password: "",
          databaseName: dbName,
        },
      };

      const expectation = {
        dbName,
        type: 'mysql',
        instance: getMySQLDbModule.client,
      };
      const result = makeDatabaseClient(dbOpt);

      expect(result).toMatchObject(expectation);
      expect(getMySQLDb).toHaveBeenCalledWith(dbOpt.mysql, dbName);
      expect(getMySQLDb).toHaveBeenCalledTimes(1);
    });

    test("When passing a non-object to makeDatabaseClient, endOnError will be run and a false value will be returned", () => {
      endOnError.mockClear();

      const result = makeDatabaseClient([]);
      expect(result).toBe(false);
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("Invalid Options Object Passed to makeDatabaseClient");
    });

    test("When passing an object without mongodb, makeDatabaseClient will run endOnError and return false", () => {
      endOnError.mockClear();

      const result = makeDatabaseClient({});
      expect(result).toBe(false);
      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("No compatible database options were provided");
    });

  });
});
