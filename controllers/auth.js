const doNothing = (req, res, next) => {
  console.log("Did nothing");
  next();
};

const passThrough = (req, res, next) => {
  console.log("Passed Through");
  next();
};

// This function authenticate's a user's credentials. The user will pass
// username and password into the function and the app will do what is
// necessary to determine if the username/password are correct.
const authenticateUserCredentials = (req, res, next) => {
  console.log("Authenticating");
  next();
};

// This function will receive a user's token or session, then determine if
// the user is authorized to get the content.
const authorizeUser = (req, res, next) => {
  next();
};

module.exports = {
  doNothing,
  passThrough,
  authenticateUserCredentials,
  authorizeUser
};