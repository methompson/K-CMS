const { isString, isFunction, isObject } = require("../k-cms/utilities");

class KCMSPlugin {
  /**
   * Constructor
   *
   * @param {Object} options Object of configuration settings.
   */
  constructor(opt) {
    // We'll set about to null to automatically disable the plugin unless it's valid.
    this.about = null;

    // If options aren't an object, we just return
    if (!isObject(opt)) {
      return;
    }

    const options = {
      ...opt,
    };

    // If there's no about option passed, we need to kill the plugin. The about option will give information
    // about the plugin that is useful in determining which options belong to which plugin.
    if (!('about' in options)) {
      return;
    }

    if ("init" in options
      && isFunction(options.init)
    ) {
      this.init = options.init;
    } else {
      this.init = () => {};
    }

    // TODO I have to define an about schema
    this.about = options.about;

    // Save some default values, just in case they aren't passed into the constructor
    if (!('enabled' in options)) {
      options.enabled = true;
    }

    // enabled tells the program whether the plugin is enabled and should be run
    this.enabled = options.enabled;

    if (!('config' in options)) {
      options.config = [];
    }
    // config is an array of configurable options that the user can modify to alter
    // the behavior of the plugin.
    this.config = options.config;

    this.hooks = {};
  }

  /**
   * This allows me to determine if a plugin can be used or not. We use both the enabled value
   * and the isValid method. The isValid method checks that all required elements are set
   * correctly.
   *
   * @returns {Boolean} Whether the plugin is enabled or not.
   */
  isEnabled() {
    return !!this.enabled && this.isValid();
  }

  /**
   * Checks required elements of the class to determine if the Plugin can be used
   *
   * @returns {Boolean} Whether the plugin is valid or not.
   */
  isValid() {
    return !!this.about;
  }

  enable() {
    if (!('enabled' in this) || this.about === null) {
      return;
    }
    this.enabled = true;
  }

  disable() {
    if (!('enabled' in this) || this.about === null) {
      return;
    }
    this.enabled = false;
  }

  /**
   * Runs an initialization function for the plugin. This function should be where
   * plugins initialiize the database for their needs.
   *
   * @param {Object} dbInstance Instance of the database for the app
   */
  initializePlugin(dbInstance) {
    let result = null;

    this.dbInstance = dbInstance;

    if (isFunction(this.init)) {
      result = this.init(dbInstance);
    }

    return Promise.resolve(result);
  }

  /**
   * Save configuration of this plugin to the database so that the state can persist
   */
  saveConfigToDb() {}

  /**
   * Get configuration from the database. When getting a configuration from the database, effort is
   * put into making sure that the values from the database don't completely overwrite the options
   * from the constructor so that new options can be added to the plugin without having to remove
   * old options from the database.
   */
  getConfigFromDb() {}

  /**
   * Remove the plugin configuration object from the database
   */
  deletePlugin() {}

  /**
   * Adds a function to a lifecycle hook.
   *
   * @param {String} lifecycle The name of the lifecycle hook
   * @param {Function} action The action that will take be run at the specified lifecycle hook
   */
  addHook(lifecycle, action) {
    // If this is an improperly set up Plugin, just return and do nothing
    if (!this.isValid()) {
      return false;
    }

    if ( !isString(lifecycle)
      || !isFunction(action)
    ) {
      return false;
    }

    if (!(lifecycle in this.hooks)) {
      this.hooks[lifecycle] = [];
    }

    this.hooks[lifecycle].push(action);

    return true;
  }

  /**
   * Runs the lifecycle hook specified in the current plugin. Does nothing if that hook
   * doesn't exist in the current plugin.
   *
   * @param {String} lifecycle the name of the lifecycle hook to run
   */
  runHook(lifecycleHook, hookArgs) {
    // Did we get a string?
    if (typeof lifecycleHook !== typeof "string") {
      return;
    }

    // does the hook exist?
    if (!(lifecycleHook in this.hooks)) {
      return;
    }

    // Go through all actions associated with that hook.
    for (let x = 0, len = this.hooks[lifecycleHook].length; x < len; ++x) {
      // Run the individual actions in that hook.
      this.hooks[lifecycleHook][x](hookArgs);
    }
  }
}

module.exports = KCMSPlugin;
