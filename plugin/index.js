class KCMSPlugin {
  constructor() {
    this.hooks = {};
  }

  addHook(lifeCycle, action) {
    const method = () => {};
    if ( typeof lifeCycle !== typeof "string"
      || typeof action !== typeof method
    ) {
      return;
    }

    if (!(lifeCycle in this.hooks)) {
      this.hooks[lifeCycle] = [];
    }

    this.hooks[lifeCycle].push(action);
    console.log("Here we are!");
  }
}

module.exports = KCMSPlugin;
