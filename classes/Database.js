const MongoClient = require('mongodb').MongoClient;

/**
 * The Database class aims to abstract several of the functions we need
 * for basic CRUD functionality. This class will be used by the pageGet,
 * pageMod and default authorization functionalities in the CMS.
 *
 * The Database object will connect to a MongoDB instance using credentials
 * passed in to the constructor.
 */
class Database {

  /**
   * The constructor creates a MongoDB connection using the options object to
   * build the url to connect to a MongoDB instance
   *
   * @param {Object} options Object of options for connecting to a MongoDB instance
   */
  constructor(options = {}) {
    let mongoUrl = "";
    if ('fullUrl' in options) {
      mongoUrl = options.fullUrl;
    } else if (
          'username' in options
      && 'password' in options
      && 'url' in options ) {
        mongoUrl = `mongodb://${options.username}:${options.password}@${options.url}`;
    } else if ('url' in options ) {
      mongoUrl = `mongodb://${options.url}`;
    } else if ('mongoInstance' in options) {
      this.client = options.mongoInstance;
      return;
    }

    if (mongoUrl.length <= 0) {
      console.log("MongoDB parameters not provided");
      process.exit(1);
    }

    this.client = new MongoClient(mongoUrl, {
      useUnifiedTopology: true,
    });

    this.client.connect((err) => {
      if (err !== null) {
        console.log("MongoDB Unable to connect", err);
        process.exit(1);
      }
    });
  }

  // Page Crud Operations
  getPage() {
  }
  addPage(pageData = {}) {
    const db = this.client.db("pages");
    db.collection("pages").insertOne({
      test1: "test1",
      test2: "test2",
    });
  }
  updatePage() {}
  deletePage() {}

  // User Crud Operations
  getUserByUsername() {}
  addUser() {}
  updateUser() {}
  deleteUser() {}
}

module.exports = Database;