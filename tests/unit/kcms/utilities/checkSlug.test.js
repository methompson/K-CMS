const checkSlug = require("../../../../kcms/utilities/checkSlug");

describe("checkSlug", () => {
  test("checkSlug will return null if it is passed a string with no spaces and only lower case letters, numbers and hypens", () => {
    let result;

    result = checkSlug("a-test-slug");
    expect(result).toBe(null);

    result = checkSlug("123456-09876");
    expect(result).toBe(null);
  });
});
