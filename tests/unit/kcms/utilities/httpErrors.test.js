const { send400Error, send401Error, send500Error } = require("../../../../kcms/utilities/httpErrors");
const { sendError } = require("../../../../kcms/utilities/sendError");

jest.mock("../../../../kcms/utilities/sendError", () => {
  const se = jest.fn(() => {});
  return {
    sendError: se,
  };
});

describe("httpErrors", () => {
  const res = {
    test: "test",
  };

  const msg = "A test Message!";

  beforeEach(() => {
    sendError.mockClear();
  });

  test("send400Error will send sendError with the passed response object, a message and a 400 error code", () => {
    send400Error(res, msg);

    expect(sendError).toHaveBeenCalledTimes(1);
    expect(sendError).toHaveBeenCalledWith(res, msg, 400);
  });

  test("send401Error will send sendError with the passed response object, a message and a 401 error code", () => {
    send401Error(res, msg);

    expect(sendError).toHaveBeenCalledTimes(1);
    expect(sendError).toHaveBeenCalledWith(res, msg, 401);
  });
  test("send500Error will send sendError with the passed response object, a message and a 500 error code", () => {
    send500Error(res, msg);

    expect(sendError).toHaveBeenCalledTimes(1);
    expect(sendError).toHaveBeenCalledWith(res, msg, 500);
  });
});
