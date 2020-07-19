const { errorIfTokenDoesNotExist } = require("../../../../kcms/utilities/errorIfTokenDoesNotExist");
const httpErrors = require("../../../../kcms/utilities/httpErrors");

jest.mock("../../../../kcms/utilities/httpErrors", () => {
  const send401Error = jest.fn(() => {});
  return {
    send401Error,
  };
});

const { send401Error } = httpErrors;
const next = jest.fn(() => {});
const res = {};

describe("errorIfTokenDoesNotExist", () => {

  beforeEach(() => {
    next.mockClear();
    send401Error.mockClear();
  });

  test("errorIfTokenDoesNotExist will simply run next and return without sending an error if the request Object contains _authdata", () => {
    const req = {
      _authData: {},
    };

    errorIfTokenDoesNotExist(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(send401Error).toHaveBeenCalledTimes(0);
  });

  test("errorIfTokenDoesNotExist will run send401Error if _authData is null in the request object", () => {
    const req = {
      _authData: null,
    };

    errorIfTokenDoesNotExist(req, res, next);

    expect(next).toHaveBeenCalledTimes(0);
    expect(send401Error).toHaveBeenCalledTimes(1);
    expect(send401Error).toHaveBeenCalledWith(res, "Invalid User Token");
  });

  test("errorIfTokenDoesNotExist will run send401Error if _authData does not exist in the request object", () => {
    const req = {};

    errorIfTokenDoesNotExist(req, res, next);

    expect(next).toHaveBeenCalledTimes(0);
    expect(send401Error).toHaveBeenCalledTimes(1);
    expect(send401Error).toHaveBeenCalledWith(res, "Invalid User Token");
  });
});
