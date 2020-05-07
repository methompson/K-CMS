const { makeDatabaseClient } = require("../../../../k-cms/database");
const getMongoDbModule = require("../../../../k-cms/database/getMongoDb");
const endOnErrorMod = require("../../../../k-cms/utilities/endOnError");

jest.mock("../../../../k-cms/database/getMongoDb", () => {
  const client = {};
  const getMongo = jest.fn(() => { return client; });
  return {
    getMongoDb: getMongo,
    client,
  };
});

jest.mock("../../../../k-cms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

const { endOnError } = endOnErrorMod;
const { getMongoDb } = getMongoDbModule;

describe("database", () => {
  describe("makeDatabaseClient", () => {
    test("When passing proper data to makeDatabaseClient, a mongoDb client will be returned in an object", () => {
      getMongoDb.mockClear();
      const dbOpt = {
        mongodb: {},
      };

      const expectation = {
        type: 'mongodb',
        instance: getMongoDbModule.client,
      };
      const result = makeDatabaseClient(dbOpt);

      expect(result).toMatchObject(expectation);
      expect(getMongoDb).toHaveBeenCalledWith(dbOpt.mongodb);
      expect(getMongoDb).toHaveBeenCalledTimes(1);
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
