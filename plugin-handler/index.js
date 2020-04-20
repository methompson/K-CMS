const KCMSPlugin = require("../plugin");

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
    this.db = database
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
      this.plugins.push(plugin);
    }
  }

  /**
   * This method will cycle through all plugins, and run the functions for each lifecycle hook.
   *
   * @param {String} hook
   */
  runLifecycleHook(hook) {
    for (let x = 0, len = this.plugins.length; x < len; ++x) {
      const plugin = this.plugins[x];

      // Run the hook for this plugin.
      if (plugin.isEnabled()) {
        plugin.runHook(hook);
      }
    }
  }
}

module.exports = PluginHandler;
