const mysql = require("mysql2");

const { getMySQLDb } = require("../../../../kcms/database/getMySQLDb");
const endOnErrorMod = require("../../../../kcms/utilities/endOnError");

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const endOnError = jest.fn(() => {});
  return {
    endOnError,
  };
});

const { Pool } = mysql;
const { endOnError } = endOnErrorMod;
const host = "98welknadnjka";
const databaseName = "asdfohujawf";
const username = "o8youadsf";
const password = "ouhasd;i23";
const port = 3456;

describe("getMySQLDb", () => {

  beforeEach(() => {
    endOnError.mockClear();
  });

  test("getMySQLDb will return a Pool object if all of the options are provided to the function", () => {
    const options = {
      host,
      databaseName,
      username,
      password,
      port,
    };

    const result = getMySQLDb(options, databaseName);
    expect(result instanceof Pool).toBe(true);
    expect(result.options).toMatchObject({
      host,
      database: databaseName,
      user: username,
      password,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  });

  test("getMySQLDb will return a Pool object if all essential options are provided to the function", () => {
    const options = {
      host,
      username,
      password,
    };

    const result = getMySQLDb(options, databaseName);
    expect(result instanceof Pool).toBe(true);
    expect(result.options).toMatchObject({
      host,
      database: databaseName,
      user: username,
      password,
      port: 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  });

  test("getMySQLDb will run endOnError if the options argument is not an object", () => {
    getMySQLDb();
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Improper Options Value Provided");
  });

  test("getMySQLDb will run endOnError if the host argument is missing from options", () => {
    const options = {
      // host,
      username,
      password,
    };

    getMySQLDb(options, databaseName);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MySQL parameters not provided");
  });

  test("getMySQLDb will run endOnError if the host argument is missing from options", () => {
    const options = {
      // host,
      username,
      password,
    };

    getMySQLDb(options, databaseName);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MySQL parameters not provided");
  });

  test("getMySQLDb will run endOnError if the databaseName argument is missing from options", () => {
    const options = {
      host,
      username,
      password,
    };

    getMySQLDb(options);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Database Name Not Provided");
  });

  test("getMySQLDb will run endOnError if the username argument is missing from options", () => {
    const options = {
      host,
      // username,
      password,
    };

    getMySQLDb(options, databaseName);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MySQL parameters not provided");
  });

  test("getMySQLDb will run endOnError if the password argument is missing from options", () => {
    const options = {
      host,
      username,
      // password,
    };

    getMySQLDb(options, databaseName);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("MySQL parameters not provided");
  });
});
