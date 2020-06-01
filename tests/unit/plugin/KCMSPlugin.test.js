const KCMSPlugin = require("../../../plugin");

describe("KCMSPlugin", () => {
  let pl;
  let opt;
  let init;

  beforeEach(() => {
    init = jest.fn(() => {});
    opt = {
      about: {},
      enabled: true,
      config: [],
      init,
    };

    pl = new KCMSPlugin(opt);
  });

  describe("Constructor", () => {
    test("When a new plugin is made, with proper options, the plugin will save the option values as class properties and create an empty hooks object", () => {
      pl = new KCMSPlugin(opt);
      expect(pl.about).toBe(opt.about);
      expect(pl.enabled).toBe(opt.enabled);
      expect(pl.config).toBe(opt.config);
      expect(pl.hooks).toMatchObject({});
      expect(pl.init).toBe(init);

      const opt2 = {
        about: { title: "Title" },
        enabled: false,
        config: [{ test: "test" }],
      };
      pl = new KCMSPlugin(opt2);
      expect(pl.about).toBe(opt2.about);
      expect(pl.enabled).toBe(opt2.enabled);
      expect(pl.config).toBe(opt2.config);
      expect(pl.hooks).toMatchObject({});
      expect(pl.init).toStrictEqual(expect.any(Function));
    });

    test("When a new plugin is made without init, enabled or config in the options, a default enabled value and default config value will be set", () => {
      opt = {
        about: {},
      };

      pl = new KCMSPlugin(opt);
      expect(pl.about).toMatchObject(opt.about);
      expect(pl.enabled).toBe(true);
      expect(pl.config).toMatchObject([]);
      expect(pl.hooks).toMatchObject({});
      expect(pl.init).toStrictEqual(expect.any(Function));
    });

    test("When a new plugin is made without an about value in the options object, a plugin won't have any defined parameters", () => {
      opt = {};

      pl = new KCMSPlugin(opt);
      expect('about' in pl).toBe(true);
      expect(pl.about).toBe(null);
      expect('enabled' in pl).toBe(false);
      expect('config' in pl).toBe(false);
      expect('hooks' in pl).toBe(false);
    });

    test("When a new plugin is made without an options object, a plugin won't have any defined parameters", () => {
      pl = new KCMSPlugin();
      expect('about' in pl).toBe(true);
      expect(pl.about).toBe(null);
      expect('enabled' in pl).toBe(false);
      expect('config' in pl).toBe(false);
      expect('hooks' in pl).toBe(false);
    });
  });

  describe("isEnabled", () => {
    test("If a KCMSPlugin is configured correctly with enabled set to true, isEnabled will return true", () => {
      expect(pl.enabled).toBe(true);
      expect('about' in pl).toBe(true);
      expect('about').not.toBe(null);
      expect(pl.isEnabled()).toBe(true);
    });

    test("If a KCMSPlugin is configured correctly with enabled set to false, isEnabled will return false", () => {
      const opt2 = {
        ...opt,
        enabled: false,
      };

      pl = new KCMSPlugin(opt2);
      expect(pl.enabled).toBe(false);
      expect('about' in pl).toBe(true);
      expect(pl.about).not.toBe(null);
      expect(pl.isEnabled()).toBe(false);
    });

    test("If a KCMSPlugin is configured incorrectly with enabled set to true, isEnabled will return false", () => {
      const opt2 = {
        enabled: true,
        config: [],
      };

      pl = new KCMSPlugin(opt2);
      expect('enabled' in pl).toBe(false);
      expect('about' in pl).toBe(true);
      expect(pl.about).toBe(null);
      expect(pl.isEnabled()).toBe(false);
    });
  });

  describe("isValid", () => {
    test("isValid will return true for a properly configured plugin", () => {
      expect(pl.about).not.toBe(null);
      expect(pl.isValid()).toBe(true);
    });

    test("isValid will return false for an improperly configured plugin", () => {
      const opt2 = {
        enabled: true,
        config: [],
      };

      pl = new KCMSPlugin(opt2);
      expect(pl.about).toBe(null);
      expect(pl.isValid()).toBe(false);
    });
  });

  describe("enable", () => {
    test("enable will set enabled to true for a properly configured plugin", () => {
      opt.enabled = false;
      pl = new KCMSPlugin(opt);

      expect(pl.isEnabled()).toBe(false);
      expect(pl.enabled).toBe(false);

      pl.enable();

      expect(pl.isEnabled()).toBe(true);
      expect(pl.enabled).toBe(true);

      pl.enable();

      expect(pl.isEnabled()).toBe(true);
      expect(pl.enabled).toBe(true);
    });

    test("enable will do nothing to an improperly configured plugin", () => {
      const opt2 = {
        enabled: false,
        config: [],
      };
      pl = new KCMSPlugin(opt2);

      expect(pl.isEnabled()).toBe(false);
      expect('enabled' in pl).toBe(false);

      pl.enable();

      expect(pl.isEnabled()).toBe(false);
      expect('enabled' in pl).toBe(false);

    });
  });

  describe("disable", () => {
    test("disable will set enabled to false for a properly configured plugin", () => {
      opt.enabled = true;
      pl = new KCMSPlugin(opt);

      expect(pl.isEnabled()).toBe(true);
      expect(pl.enabled).toBe(true);

      pl.disable();

      expect(pl.isEnabled()).toBe(false);
      expect(pl.enabled).toBe(false);

      pl.disable();

      expect(pl.isEnabled()).toBe(false);
      expect(pl.enabled).toBe(false);
    });

    test("disable will do nothing to an improperly configured plugin", () => {
      const opt2 = {
        enabled: true,
        config: [],
      };
      pl = new KCMSPlugin(opt2);

      expect(pl.isEnabled()).toBe(false);
      expect('enabled' in pl).toBe(false);

      pl.disable();

      expect(pl.isEnabled()).toBe(false);
      expect('enabled' in pl).toBe(false);

    });
  });

  describe("initializePlugin", () => {
    test("Initialize Plugin will run a plugin's init function, if it exists", (done) => {
      pl.initializePlugin()
        .then(() => {
          expect(init).toHaveBeenCalledTimes(1);
          done();
        });
    });

    test("Initialize plugin will return the value returned by the initialization function", (done) => {
      const returnValue = "69";
      const newInit = jest.fn(() => {
        return returnValue;
      });
      opt.init = newInit;

      const pl1 = new KCMSPlugin(opt);

      pl1.initializePlugin()
        .then((result) => {
          expect(result).toBe(returnValue);
          expect(newInit).toHaveBeenCalledTimes(1);

          done();
        });
    });

    test("If the init function was changed after the plugin was constructed, the plugin function will return null if the init member value is not a function", (done) => {
      pl.init = true;

      pl.initializePlugin()
        .then((result) => {
          expect(result).toBe(null);
          expect(init).toHaveBeenCalledTimes(0);

          done();
        });
    });

    test("If a plugin is generated without an init function, it will still run and won't return null", (done) => {
      delete opt.init;

      pl = new KCMSPlugin(opt);

      pl.initializePlugin()
        .then((result) => {
          expect(result).not.toBe(null);

          done();
        });
    });

  });

  describe("addHook", () => {
    const lifecycle1 = "lf1";
    const action1 = () => { console.log("action1"); };
    const lifecycle2 = "lf2";
    const action2 = () => { console.log("action2"); };
    const action3 = () => { console.log("action3"); };

    test("addHook will add a function to the hooks under the specified lifecycle for a properly configured plugin", () => {
      const resp1 = pl.addHook(lifecycle1, action1);
      const resp2 = pl.addHook(lifecycle1, action3);
      const resp3 = pl.addHook(lifecycle2, action2);

      expect(resp1).toBe(true);
      expect(resp2).toBe(true);
      expect(resp3).toBe(true);
      expect(lifecycle1 in pl.hooks).toBe(true);
      expect(lifecycle2 in pl.hooks).toBe(true);
      expect(Array.isArray(pl.hooks[lifecycle1])).toBe(true);
      expect(Array.isArray(pl.hooks[lifecycle2])).toBe(true);
      expect(pl.hooks[lifecycle1].length).toBe(2);
      expect(pl.hooks[lifecycle2].length).toBe(1);
      expect(pl.hooks[lifecycle1][0]).toBe(action1);
      expect(pl.hooks[lifecycle1][1]).toBe(action3);
      expect(pl.hooks[lifecycle2][0]).toBe(action2);
    });

    test("addHook will not add a function to the hooks if the plugin is invalid", () => {
      const opt2 = {
        enabled: true,
        config: [],
      };

      pl = new KCMSPlugin(opt2);
      expect('hooks' in pl).toBe(false);

      const resp1 = pl.addHook(lifecycle1, action1);
      const resp2 = pl.addHook(lifecycle1, action3);
      const resp3 = pl.addHook(lifecycle2, action2);

      expect(resp1).toBe(false);
      expect(resp2).toBe(false);
      expect(resp3).toBe(false);

      expect('hooks' in pl).toBe(false);
    });

    test("addHook will not add a function to the hooks if the actions added aren't functions", () => {
      const action4 = {};
      const action5 = [];
      const action6 = 69;
      const action7 = '69';
      const action8 = null;

      expect('hooks' in pl).toBe(true);
      expect(lifecycle1 in pl.hooks).toBe(false);

      const resp1 = pl.addHook(lifecycle1, action4);
      const resp2 = pl.addHook(lifecycle1, action5);
      const resp3 = pl.addHook(lifecycle1, action6);
      const resp4 = pl.addHook(lifecycle1, action7);
      const resp5 = pl.addHook(lifecycle1, action8);

      expect(resp1).toBe(false);
      expect(resp2).toBe(false);
      expect(resp3).toBe(false);
      expect(resp4).toBe(false);
      expect(resp5).toBe(false);

      expect(lifecycle1 in pl.hooks).toBe(false);
    });

    test("addHook will not add a function to the hooks if the lifecycles added aren't strings", () => {
      const lifecycle4 = {};
      const lifecycle5 = [];
      const lifecycle6 = 69;
      const lifecycle7 = () => {};
      const lifecycle8 = null;

      expect('hooks' in pl).toBe(true);
      expect(Object.keys(pl.hooks).length).toBe(0);

      const resp1 = pl.addHook(lifecycle4, action1);
      const resp2 = pl.addHook(lifecycle5, action1);
      const resp3 = pl.addHook(lifecycle6, action1);
      const resp4 = pl.addHook(lifecycle7, action1);
      const resp5 = pl.addHook(lifecycle8, action1);

      expect(resp1).toBe(false);
      expect(resp2).toBe(false);
      expect(resp3).toBe(false);
      expect(resp4).toBe(false);
      expect(resp5).toBe(false);

      expect(Object.keys(pl.hooks).length).toBe(0);
    });

  });

  describe("runHook", () => {
    const lifecycle1 = "lf1";
    const action1 = jest.fn(() => {});
    const lifecycle2 = "lf2";
    const action2 = jest.fn(() => {});
    const action3 = jest.fn(() => {});

    beforeEach(() => {
      action1.mockClear();
      action2.mockClear();
      action3.mockClear();
    });

    test("runHook will run a lifecycleHook if it exists in the plugin", () => {
      pl.addHook(lifecycle1, action1);
      pl.addHook(lifecycle2, action2);
      pl.addHook(lifecycle2, action3);

      pl.runHook(lifecycle1);

      expect(action1).toHaveBeenCalledTimes(1);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);

      pl.runHook("non-existent lifecycle hook");

      expect(action1).toHaveBeenCalledTimes(1);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);

      pl.runHook(lifecycle2);
      expect(action2).toHaveBeenCalledTimes(1);
      expect(action3).toHaveBeenCalledTimes(1);
    });

    test("runHook will only run actions if they are part of the lifecycle. Non-existent lifecycle hooks won't affect other lifecycle hooks", () => {
      pl.addHook(lifecycle1, action1);
      pl.addHook(lifecycle2, action2);
      pl.addHook(lifecycle2, action3);

      expect(action1).toHaveBeenCalledTimes(0);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);

      pl.runHook("non-existent lifecycle hook");
      pl.runHook("non-existent lifecycle hoo2k");
      pl.runHook("non-existent lifecycle hook3");
      pl.runHook("non-existent lifecycle hook4");
      pl.runHook("non-existent lifecycle hook5");

      expect(action1).toHaveBeenCalledTimes(0);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);
    });

    test("runHook will not do anything if the lifecycle hook isn't a string", () => {
      pl.addHook(lifecycle1, action1);
      pl.addHook(lifecycle2, action2);
      pl.addHook(lifecycle2, action3);

      expect(action1).toHaveBeenCalledTimes(0);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);

      pl.runHook(69);
      pl.runHook({});
      pl.runHook([]);
      pl.runHook(null);
      pl.runHook(() => {});

      expect(action1).toHaveBeenCalledTimes(0);
      expect(action2).toHaveBeenCalledTimes(0);
      expect(action3).toHaveBeenCalledTimes(0);
    });

  });
});
