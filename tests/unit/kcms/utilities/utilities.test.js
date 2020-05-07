const utilities = require("../../../../k-cms/utilities");
const { send401Error } = require("../../../../k-cms/utilities/httpErrors");

jest.mock("../../../../k-cms/utilities/httpErrors", () => {
  const se = jest.fn(() => {});
  return {
    send401Error: se,
  };
});

const next = jest.fn(() => {});

describe("utilities", () => {
  beforeEach(() => {
    next.mockClear();
  });

  describe("errorIfTokenDoesNotExist", () => {
    test("errorIfTokenDoesNotExist will run next if the object contains an _authData object", () => {
      const req = {
        _authData: {},
      };

      utilities.errorIfTokenDoesNotExist(req, {}, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test("errorIfTokenDoesNotExist will run send401Error if the requeset does not contain an _authData object", () => {
      const req = {};

      utilities.errorIfTokenDoesNotExist(req, {}, next);
      expect(send401Error).toHaveBeenCalledTimes(1);
    });
  });
});
