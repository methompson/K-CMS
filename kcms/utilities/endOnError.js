/**
 * Sends an error to the application administration if they configure the CMS
 * incorrectly. If there's a problem with CMS configuration (e.g. incorrect types
 * improper data, etc.), we don't want the application to start up and be a problem
 * so, this function lets the user know WHY their app isn't running.
 *
 * The function is separated into its own module to fascilitate testing
 *
 * @param {String} error error message to display
 */
function endOnError(error = "", code = 1) {
  console.log(error);
  process.exit(code);
}

module.exports = {
  endOnError,
};
