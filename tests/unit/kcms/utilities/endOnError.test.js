const { endOnError } = require("../../../../kcms/utilities/endOnError");

describe("endOnError", () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

  beforeEach(() => {
    mockExit.mockClear();
  });

  test("endOnError will log an error and exit the app with a code", () => {
    const logSpy = jest.spyOn(console, 'log');
    const test1 = "test error 69 123 xyz";
    const code1 = 69;

    const test2 = "test error 123 987 abc xyz";
    const code2 = 83;

    endOnError(test1, code1);
    expect(logSpy).toHaveBeenCalledWith(test1);
    expect(mockExit).toHaveBeenCalledWith(code1);

    endOnError(test2, code2);
    expect(logSpy).toHaveBeenCalledWith(test2);
    expect(mockExit).toHaveBeenCalledWith(code2);
  });

  test("endOnError will log a default error and exit the app with a default code if no parameters are specified", () => {
    const logSpy = jest.spyOn(console, 'log');

    endOnError();
    expect(logSpy).toHaveBeenCalledWith("");
    expect(mockExit).toHaveBeenCalledWith(1);

    endOnError("test");
    expect(logSpy).toHaveBeenCalledWith("test");
    expect(mockExit).toHaveBeenCalledWith(1);


  });
});
