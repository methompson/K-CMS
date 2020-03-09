const doNothing = (req, res, next) => {
  res.status(200).send("<h1>Edit Pages</h1>");
};

module.exports = {
  doNothing,
};