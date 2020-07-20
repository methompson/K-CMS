const {
  isObject,
  isString,
  isNumber,
  isUndefined,
} = require("../../kcms/utilities/isData");

function checkAdminInfo(adminInfo) {
  if (!isObject(adminInfo)) {
    return "Admin information must be an object";
  }

  if (!isUndefined(adminInfo.firstName) && !isString(adminInfo.firstName) ) {
    return "firstName must be a string";
  }

  if (!isUndefined(adminInfo.firstName) && !isString(adminInfo.lastName)) {
    return "lastName must be a string";
  }

  if (!isString(adminInfo.username)) {
    return "username is required and must be a string";
  }

  if (!isString(adminInfo.email)) {
    return "email is required and must be a string";
  }

  if (!isString(adminInfo.password)) {
    return "password is required and must be a string";
  }

  return null;
}

function checkSqlInfo(mysqlInfo) {
  if (!isObject(mysqlInfo)) {
    return "MySQL information must be an object";
  }

  if (!isString(mysqlInfo.host)) {
    return "host is required and must be a string";
  }

  if (!isNumber(mysqlInfo.port)) {
    return "port is required and must be a numbner";
  }

  if (!isString(mysqlInfo.databaseName)) {
    return "databaseName is required and must be a string";
  }

  if (!isString(mysqlInfo.username)) {
    return "username is required and must be a string";
  }

  if (!isString(mysqlInfo.password)) {
    return "password is required and must be a string";
  }


  return null;
}

function checkMongoInfo(mongoInfo) {
  if (!isObject(mongoInfo)) {
    return "MongoDb information must be an object";
  }

  if (!isString(mongoInfo.username)) {
    return "username is required and must be a string";
  }

  if (!isString(mongoInfo.password)) {
    return "password is required and must be a string";
  }

  if (!isString(mongoInfo.url)) {
    return "url is required and must be a string";
  }

  return null;
}

module.exports = {
  checkAdminInfo,
  checkSqlInfo,
  checkMongoInfo,
};
