const http = require("http");

const { sendError } = require("../../../../kcms/utilities/sendError");
const { endOnError } = require("../../../../kcms/utilities/endOnError");

jest.mock("../../../../kcms/utilities/endOnError", () => {
  const eoe = jest.fn(() => {});
  return {
    endOnError: eoe,
  };
});

jest.mock("http", () => {
  const json = jest.fn(() => {});
  const status = jest.fn(() => {
    return { json };
  });

  function ServerResponse() {}
  ServerResponse.prototype.status = status;

  return {
    ServerResponse,
    json,
    status,
  };
});

const { status, json } = http;

describe("sendError", () => {
  let res;
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

  beforeEach(() => {
    mockExit.mockClear();
    res = new http.ServerResponse();
    status.mockClear();
    json.mockClear();
  });

  test("sendError will run status given the code provided and json with a specific object included the message provided", () => {
    const test1 = "test message 123";
    const test2 = "test 69 message";

    const code1 = 69;
    const code2 = 96;

    sendError(res, test1, code1);
    sendError(res, test2, code2);

    expect(status).toHaveBeenCalledTimes(2);
    expect(json).toHaveBeenCalledTimes(2);

    expect(status).toHaveBeenNthCalledWith(1, code1);
    expect(status).toHaveBeenNthCalledWith(2, code2);
    expect(json).toHaveBeenNthCalledWith(1, expect.objectContaining({ error: test1 }));
    expect(json).toHaveBeenNthCalledWith(2, expect.objectContaining({ error: test2 }));
  });

  test("sendError will run endOnError if an improper http.ServerResponse object is sent to it", () => {
    const json2 = jest.fn(() => {});
    const status2 = jest.fn(() => {
      return {
        json: json2,
      };
    });

    const res2 = {
      status: status2,
    };

    const test = "test message 123";
    const code = 69;

    sendError(res2, test, code);
    expect(status).toHaveBeenCalledTimes(0);
    expect(json).toHaveBeenCalledTimes(0);
    expect(endOnError).toHaveBeenCalledTimes(1);
    expect(endOnError).toHaveBeenCalledWith("Invalid Response Object", 1);
  });

});
