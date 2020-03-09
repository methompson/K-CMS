const CMS = require('./classes/CMS');

function createNewApp(options = {}) {

  const cms = new CMS(options);

  return cms;
}

module.exports = createNewApp;