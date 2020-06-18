const { isString } = require("./isData");

/**
 * Check that the slug provided fulfills the requirements of the application.
 *
 * Slug Requirements:
 * All lower case
 * No spaces or special characters except for hyphen
 *
 * @param {String} slug the slug string to check
 */
function checkSlug(slug) {
  if (!isString(slug)) {
    return "Invalid Slug Type";
  }

  if (slug.length < 1 || slug.length > 512) {
    return "Invalid Slug Length";
  }

  const regex = RegExp(/[^a-z0-9-]+/g);

  // We return not regex.test because if the regular expression is set up to return true if it
  // finds any illegal characters. We want checkSlug to return true if the slug is valid.
  // Thus, if regex.test returns true, the slug is not valid.
  if (regex.test(slug)) {
    return "Invalid Characters in Slug";
  }

  return null;
}

module.exports = checkSlug;
