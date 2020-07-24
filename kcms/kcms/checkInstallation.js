function checkInstallation(cms) {
  return cms.checkDbInstallation()
    .then(() => {
      cms.initHandlersAndControllers();
    })
    .catch(() => {
      cms.initUninstalledState();
    });
}

module.exports = checkInstallation;
