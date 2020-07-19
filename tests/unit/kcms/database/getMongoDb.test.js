const { MongoClient } = require("mongodb");

const { getMongoDb } = require("../../../../kcms/database/getMongoDb");
const endOnErrorMod = require("../../../../kcms/utilities/endOnError");

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

const { endOnError } = endOnErrorMod;
const username = "o8youadsf";
const password = "ouhasd;i23";
const url = "0yfiohhfoaiwgf";

describe("getMongoDb", () => {
  test("getMongoDb will return a MongoClient object if the options provide a fullUrl", () => {
    const fullUrl = "this is my full url!";
    const opt = {
      fullUrl,
    };

    const result = getMongoDb(opt);
    expect(result instanceof MongoClient).toBe(true);
    expect(result.url).toBe(fullUrl);
    expect(result.options).toMatchObject({ useUnifiedTopology: true });
  });

  test("getMongoDb will return a MongoClient object if the options provide a username, password and url", () => {
    const fullUrl = `mongodb://${username}:${password}@${url}`;
    const opt = {
      username,
      password,
      url,
    };

    const result = getMongoDb(opt);
    expect(result instanceof MongoClient).toBe(true);
    expect(result.url).toBe(fullUrl);
    expect(result.options).toMatchObject({ useUnifiedTopology: true });
  });

  test("getMongoDb will return a MongoClient object if the options provide a url w/o username and password", () => {
    const fullUrl = `mongodb://${url}`;
    const opt = {
      url,
    };

    const result = getMongoDb(opt);
    expect(result instanceof MongoClient).toBe(true);
    expect(result.url).toBe(fullUrl);
    expect(result.options).toMatchObject({ useUnifiedTopology: true });
  });

  test("getMongoDb will return a client if it was passed as a part of the options object", () => {
    const client = new MongoClient(url, {});
    const opt = {
      mongoInstance: client,
    };

    const result = getMongoDb(opt);
    expect(result instanceof MongoClient).toBe(true);
    expect(result).toBe(client);
  });

  test("getMongoDb will endOnError if the mongoInstance passed is NOT an instance of a MongoClient", () => {
    endOnError.mockClear();
    const opt = {
      mongoInstance: {},
    };

    getMongoDb(opt);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
  });

  test("getMongoDb will end on error if client.connect has an error", () => {
    endOnError.mockClear();
    const error = "Test Error";
    MongoClient.prototype.connect.mockImplementationOnce((cb) => {
      cb(error);
    });

    const fullUrl = "this is my full url!";
    const opt = {
      fullUrl,
    };

    getMongoDb(opt);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith(`MongoDB Unable to connect - ${error}`);
  });

  test("getMongoDb will end on error if the url for mongodb is 0 length", () => {
    endOnError.mockClear();
    const fullUrl = "";
    const opt = {
      fullUrl,
    };

    getMongoDb(opt);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
  });

  test("getMongoDb will end on error if the options parameter is not an object", () => {
    endOnError.mockClear();
    getMongoDb([]);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");

    endOnError.mockClear();
    getMongoDb(null);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");

    endOnError.mockClear();
    getMongoDb(69);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");

    endOnError.mockClear();
    getMongoDb("69");
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");

    endOnError.mockClear();
    getMongoDb(true);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");

  });

  test("getMongoDb will end on error if the url for mongodb is 0 length", () => {
    endOnError.mockClear();
    const fullUrl = "";
    const opt = {
      fullUrl,
    };

    getMongoDb(opt);

    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
  });

  describe("Imcomplete Parameters", () => {
    test("getMongoDb will end on error if proper parameters are not provided", () => {
      endOnError.mockClear();
      const opt = {
        username,
        password,
      };

      getMongoDb(opt);

      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
    });

    test("getMongoDb will end on error if proper parameters are not provided", () => {
      endOnError.mockClear();
      const opt = {
        username,
      };

      getMongoDb(opt);

      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
    });

    test("getMongoDb will end on error if proper parameters are not provided", () => {
      endOnError.mockClear();
      const opt = {
        password,
      };

      getMongoDb(opt);

      expect(endOnError).toHaveBeenCalledTimes(1);
      expect(endOnError).toHaveBeenCalledWith("MongoDB parameters not provided");
    });

  });

});
