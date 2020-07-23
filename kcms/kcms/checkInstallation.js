function checkInstallation(cms) {
  cms.checkDbInstallation()
    .then(() => {
      cms.initHandlersAndControllers();
    })
    .catch(() => {
      cms.initUninstalledState();
    });
}

module.exports = checkInstallation;
