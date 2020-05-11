const KCMSPlugin = require("../../plugin");

class PluginHandler {
  /**
   * Constructor. Sets the plugins array of the PluginHandler Object. If the user passes an
   * array, the constructor will investigate each element and determine if the element is
   * a KCMSPlugin object and add it to the plugins array. Otherwise, it's set with an
   * empty array.
   *
   * @param {Array} plugins An array of (potential) KCMSPlugin objects
   */
  constructor(database, plugins) {
    this.plugins = [];
    this.db = database;

    if (Array.isArray(plugins)) {

      for (let x = 0, len = plugins.length; x < len; ++x) {
        if (plugins[x] instanceof KCMSPlugin) {
          this.plugins.push(plugins[x]);
        }
      }

    }
  }

  /**
   * Adds a plugin to the PluginHandler.
   *
   * @param {KCMSPlugin} plugin A plugin to add to the array
   */
  addPlugin(plugin) {
    if (plugin instanceof KCMSPlugin) {
      let alreadyInList = false;
      for (let x = 0, len = this.plugins.length; x < len; ++x) {
        if (this.plugins[x] === plugin) {
          alreadyInList = true;
        }
      }

      if (!alreadyInList) {
        this.plugins.push(plugin);
      }
    }
  }

  /**
   * This method will cycle through all plugins, and run the lifecycle hook functions for each plugin.
   *
   * @param {String} hook the name of the lifecycle hook to be run
   * @param {Object} args arguments that are passed from the running function to that lifecycle hook.
   */
  runLifecycleHook(hook, args = {}) {
    for (let x = 0, len = this.plugins.length; x < len; ++x) {
      const plugin = this.plugins[x];

      const hookArgs = {
        ...args,
        database: this.db,
      };

      // Run the hook for this plugin.
      if (plugin.isEnabled()) {
        plugin.runHook(hook, hookArgs);
      }
    }
  }
}

module.exports = PluginHandler;
