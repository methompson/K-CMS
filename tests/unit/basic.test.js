const express = require("express");

describe("Basic Test To Confirm Jest is functioning correctly", () => {
  test("1 plus 1 is 2", () => {
    expect(1 + 1).toBe(2);
  });

  test("The Express mock mocks functions correctly", () => {
    // A test function exists in the express mock and returns a string "test"
    expect(express.test()).toBe("test");
  });

  test("I can get an express router and set posts and gets", () => {
    const router = express.Router();

    router.post('/test1');
    router.get('/test1');
    router.all('/test1');

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.all).toHaveBeenCalledTimes(1);
  });
});
