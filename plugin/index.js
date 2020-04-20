class KCMSPlugin {
  /**
   * Constructor
   *
   * @param {Object} options Object of configuration settings.
   */
  constructor(opt = {}) {
    const options = {
      ...opt,
    };

    // If there's no about option passed, we need to kill the plugin. The about option will give information
    // about the plugin that is useful in determining which options belong to which plugin.
    if (!('about' in options)) {
      this.about = null;
      return;
    }

    // I have to define an about schema
    this.about = options.about;

    // Save some default values, just in case they aren't passed into the constructor
    if (!('enabled' in options)) {
      options.enabled = true;
    }

    if (!('config' in options)) {
      options.config = [];
    }

    // enabled tells the program whether the plugin is enabled and should be run
    this.enabled = options.enabled;

    // config is an array of configurable options that the user can modify to alter
    // the behavior of the plugin.
    this.config = options.config;
    this.hooks = {};
  }

  /**
   * This allows me to determine if a plugin can be used or now. I check both the enabled boolean and
   * whether the about object exists. As time goes on, if other aspects of the plugin are required for
   * the plugin to run, this is where they should be placed.
   *
   * @return {Boolean} Whether the plugin is enabled or not.
   */
  isEnabled() {
    return this.enabled && this.about;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
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
    if (!this.isEnabled()) {
      return false;
    }

    const method = () => {};
    if ( typeof lifecycle !== typeof "string"
      || typeof action !== typeof method
    ) {
      return false;
    }

    if (!(lifecycle in this.hooks)) {
      this.hooks[lifecycle] = [];
    }

    this.hooks[lifecycle].push(action);
    // console.log("Here we are!");

    return true;
  }

  /**
   * Runs the lifecycle hook specified in the current plugin. Does nothing if that hook
   * doesn't exist in the current plugin.
   *
   * @param {String} lifecycle the name of the lifecycle hook to run
   */
  runHook(lifecycleHook) {
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
      this.hooks[lifecycleHook][x]();
    }
  }
}

module.exports = KCMSPlugin;
