const PluginHandler = require("../../../../kcms/plugin-handler");
const KCMSPlugin = require("../../../../plugin");

jest.mock("../../../../plugin", () => {
  function pl(name) {
    this.enabled = true;
    this.name = name;
  }
  pl.prototype.runHook = function runHook() {};
  pl.prototype.isEnabled = function isEnabled() {
    return this.enabled;
  };
  pl.prototype.initializePlugin = function initializePlugin() {
    return Promise.resolve();
  };

  return pl;
});

describe("PluginHandler", () => {

  describe("constructor", () => {
    test("The constructor will save a database passed to it and create an empty plugins array", () => {
      const db = {};
      // const plugin1 = new KCMSPlugin();
      // const plugin2 = new KCMSPlugin();
      // const plugin3 = {};

      const ph = new PluginHandler(db);

      expect(ph.db).toBe(db);
      expect(Array.isArray(ph.plugins)).toBe(true);
      expect(ph.plugins.length).toBe(0);
    });

  });

  describe("addPlugins", () => {

    test("addPlugins will add plugins to the Plugin Handler if they are KCMSPlugins in an array", (done) => {
      const plugin1 = new KCMSPlugin();
      const plugin2 = new KCMSPlugin();
      const plugin3 = new KCMSPlugin();

      const initSpy1 = jest.spyOn(plugin1, "initializePlugin");
      const initSpy2 = jest.spyOn(plugin2, "initializePlugin");
      const initSpy3 = jest.spyOn(plugin3, "initializePlugin");

      const ph = new PluginHandler({});
      expect(ph.plugins.length).toBe(0);

      const add = [];

      add.push(ph.addPlugins([plugin1]));
      add.push(ph.addPlugins([plugin2, plugin3]));
      add.push(ph.addPlugins([{}]));
      add.push(ph.addPlugins(null));

      Promise.all(add)
        .catch(() => {})
        .then(() => {
          expect(ph.plugins.length).toBe(3);
          expect(initSpy1).toHaveBeenCalledTimes(1);
          expect(initSpy2).toHaveBeenCalledTimes(1);
          expect(initSpy3).toHaveBeenCalledTimes(1);
          done();
        });
    });

    test("addPlugins will add a plugin to the Plugin Handler only if it doesn't already exist in the Plugin Handler", (done) => {
      const plugin1 = new KCMSPlugin("plugin1");
      const plugin2 = new KCMSPlugin("plugin2");

      const ph = new PluginHandler({});
      expect(ph.plugins.length).toBe(0);

      ph.addPlugins([plugin1])
        .then(() => {
          return ph.addPlugins([plugin1]);
        })
        .then(() => {
          return ph.addPlugins([plugin2]);
        })
        .then(() => {
          return ph.addPlugins([plugin1, plugin2]);
        })
        .then(() => {
          expect(ph.plugins.length).toBe(2);

          done();
        });
    });
  });

  describe("runLifecycleHook", () => {

    test("runLifecycleHook will run hooks only on plugins that are enabled", (done) => {
      const plugin1 = new KCMSPlugin();
      const plugin2 = new KCMSPlugin();
      plugin2.enabled = false;

      const isEnabledSpy1 = jest.spyOn(plugin1, 'isEnabled');
      const isEnabledSpy2 = jest.spyOn(plugin2, 'isEnabled');

      const runHookSpy1 = jest.spyOn(plugin1, 'runHook');
      const runHookSpy2 = jest.spyOn(plugin2, 'runHook');

      const db = {
        db: "db",
      };

      const ph = new PluginHandler(db);
      ph.addPlugins([plugin1, plugin2])
        .then(() => {
          const args = {
            test: "test",
          };
          ph.runLifecycleHook("test", args);

          expect(isEnabledSpy1).toHaveBeenCalledTimes(1);
          expect(isEnabledSpy2).toHaveBeenCalledTimes(1);
          expect(runHookSpy1).toHaveBeenCalledTimes(1);
          expect(runHookSpy2).toHaveBeenCalledTimes(0);

          expect(runHookSpy1).toHaveBeenCalledWith("test", expect.objectContaining({ ...args, database: { ...db } }));

          done();
        });

    });

    test("runLifecycleHook will run hooks only on plugins that are enabled using a default argument object if none is prvided", () => {
      const plugin1 = new KCMSPlugin();
      const plugin2 = new KCMSPlugin();
      plugin2.enabled = false;

      const isEnabledSpy1 = jest.spyOn(plugin1, 'isEnabled');
      const isEnabledSpy2 = jest.spyOn(plugin2, 'isEnabled');

      const runHookSpy1 = jest.spyOn(plugin1, 'runHook');
      const runHookSpy2 = jest.spyOn(plugin2, 'runHook');

      const db = {
        db: "db",
      };

      const ph = new PluginHandler(db);
      ph.addPlugins([plugin1, plugin2])
        .then(() => {
          ph.runLifecycleHook("test");

          expect(isEnabledSpy1).toHaveBeenCalledTimes(1);
          expect(isEnabledSpy2).toHaveBeenCalledTimes(1);
          expect(runHookSpy1).toHaveBeenCalledTimes(1);
          expect(runHookSpy2).toHaveBeenCalledTimes(0);

          expect(runHookSpy1).toHaveBeenCalledWith("test", expect.objectContaining({ database: { ...db } }));
        });
    });

  });

});
