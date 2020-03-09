exports.endOnError = (error = "") => {
  console.log(error);
  process.exit(1);
}