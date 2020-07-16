const { isString } = require("./isData");

/**
 * Check that the slug provided fulfills the requirements of the application.
 *
 * Slug Requirements:
 * All lower case
 * No spaces or special characters except for hyphen
 *
 * @param {String} slug the slug string to check
 * @returns {null|String} returns a string if there's an error and null otherwise
 */
function checkSlug(slug) {
  if (!isString(slug)) {
    return "Invalid Slug Type";
  }

  if (slug.length < 1 || slug.length > 512) {
    return "Invalid Slug Length";
  }

  // The hat character indicates that we are checking if there are characters
  // NOT in the list.
  const regex = RegExp(/[^a-z0-9-]+/g);

  // We don't return regex.test directly.
  if (regex.test(slug)) {
    return "Invalid Characters in Slug";
  }

  return null;
}

module.exports = checkSlug;
