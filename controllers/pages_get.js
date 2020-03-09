const doNothing = (req, res, next) => {
  res.status(200).send("<h1>Got Pages</h1>");
};

module.exports = {
  doNothing,
};