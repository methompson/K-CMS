const KCMSPlugin = require("../../plugin");

const { isObject } = require("../utilities");

class PluginHandler {


  /**
   * Constructor. Sets the plugins array of the PluginHandler Object. If the user passes an
   * array, the constructor will investigate each element and determine if the element is
   * a KCMSPlugin object and add it to the plugins array. Otherwise, it's set with an
   * empty array.
   *
   * @param {*} database
   */
  constructor(database) {
    this.plugins = [];
    this.db = database;
  }

  /**
   * Adds an array of plugins to the PluginHandler.
   *
   * @param {KCMSPlugin} plugin A plugin to add to the array
   */
  addPlugins(plugins) {

    if (!Array.isArray(plugins)) {
      return Promise.resolve();
    }

    const promises = [];

    plugins.forEach((plugin) => {
      if (plugin instanceof KCMSPlugin) {
        const alreadyInList = this.plugins.some((p) => {
          return p === plugin;
        });

        if (!alreadyInList) {
          const p = plugin.initializePlugin(this.db)
            .then(() => {
              // We wait until initializePlugin to resolve successfully to
              // add the plugin to the list. If the end result is a catch
              // we skip this.
              this.plugins.push(plugin);
            });

          // Collect all initialization promises into an array
          promises.push(p);
        }
      }
    });

    return Promise.all(promises);
  }

  /**
   * This method will cycle through all plugins, and run the lifecycle hook functions for each plugin.
   *
   * @param {String} hook the name of the lifecycle hook to be run
   * @param {Object} passedArgs arguments that are passed from the running function to that lifecycle hook.
   */
  runLifecycleHook(hook, passedArgs) {
    let hookArgs;
    if (!isObject(passedArgs)) {
      hookArgs = {};
    } else {
      hookArgs = passedArgs;
    }

    hookArgs.database = this.db;

    this.plugins.forEach((plugin) => {

      // Run the hook for this plugin.
      if (plugin.isEnabled()) {
        plugin.runHook(hook, hookArgs);
      }
    });
  }
}

module.exports = PluginHandler;
