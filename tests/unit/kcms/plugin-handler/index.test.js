const PluginHandler = require("../../../../kcms/plugin-handler");
const KCMSPlugin = require("../../../../plugin");

jest.mock("../../../../plugin", () => {
  function pl() {
    this.enabled = true;
  }
  pl.prototype.runHook = function runHook() {};
  pl.prototype.isEnabled = function isEnabled() {
    return this.enabled;
  };

  return pl;
});

describe("KCMSPlugin", () => {

  describe("constructor", () => {
    test("The constructor will save a database passed to it and save all instaces of KCMSPlugins to an array", () => {
      const db = {};
      const plugin1 = new KCMSPlugin();
      const plugin2 = new KCMSPlugin();
      const plugin3 = {};

      const ph = new PluginHandler(db, [plugin1, plugin2, plugin3]);

      expect(ph.db).toBe(db);
      expect(Array.isArray(ph.plugins)).toBe(true);
      expect(ph.plugins.length).toBe(2);
    });

    test("The constructor will only add plugins if the plugin argument is an array", () => {
      let ph;

      const db = {};
      const plugin1 = new KCMSPlugin();

      ph = new PluginHandler(db, plugin1);

      expect(Array.isArray(ph.plugins)).toBe(true);
      expect(ph.plugins.length).toBe(0);

      ph = new PluginHandler(db, { plugin: plugin1 });
      expect(Array.isArray(ph.plugins)).toBe(true);
      expect(ph.plugins.length).toBe(0);

      ph = new PluginHandler(db, null);
      expect(Array.isArray(ph.plugins)).toBe(true);
      expect(ph.plugins.length).toBe(0);
    });

  });

  describe("addPlugin", () => {

    test("addPlugin will add plugins to the Plugin Handler if they are KCMSPlugins", () => {
      const plugin = new KCMSPlugin();

      const ph = new PluginHandler({});
      expect(ph.plugins.length).toBe(0);

      ph.addPlugin(plugin);
      expect(ph.plugins.length).toBe(1);

      ph.addPlugin({});
      expect(ph.plugins.length).toBe(1);

      ph.addPlugin(null);
      expect(ph.plugins.length).toBe(1);
    });

    test("addPlugin will add a plugin to the Plugin Handler only if it doesn't already exist in the Plugin Handler", () => {
      const plugin1 = new KCMSPlugin();
      const plugin2 = new KCMSPlugin();

      const ph = new PluginHandler({});
      expect(ph.plugins.length).toBe(0);

      ph.addPlugin(plugin1);
      expect(ph.plugins.length).toBe(1);

      ph.addPlugin(plugin1);
      expect(ph.plugins.length).toBe(1);

      ph.addPlugin(plugin2);
      expect(ph.plugins.length).toBe(2);
    });
  });

  describe("runLifecycleHook", () => {

    test("runLifecycleHook will run hooks only on plugins that are enabled", () => {
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

      const ph = new PluginHandler(db, [plugin1, plugin2]);
      const args = {
        test: "test",
      };
      ph.runLifecycleHook("test", args);

      expect(isEnabledSpy1).toHaveBeenCalledTimes(1);
      expect(isEnabledSpy2).toHaveBeenCalledTimes(1);
      expect(runHookSpy1).toHaveBeenCalledTimes(1);
      expect(runHookSpy2).toHaveBeenCalledTimes(0);

      expect(runHookSpy1).toHaveBeenCalledWith("test", expect.objectContaining({ ...args, database: { ...db } }));

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

      const ph = new PluginHandler(db, [plugin1, plugin2]);
      ph.runLifecycleHook("test");

      expect(isEnabledSpy1).toHaveBeenCalledTimes(1);
      expect(isEnabledSpy2).toHaveBeenCalledTimes(1);
      expect(runHookSpy1).toHaveBeenCalledTimes(1);
      expect(runHookSpy2).toHaveBeenCalledTimes(0);

      expect(runHookSpy1).toHaveBeenCalledWith("test", expect.objectContaining({ database: { ...db } }));

    });

  });

});
