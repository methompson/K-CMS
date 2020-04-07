const { ObjectId } = require("mongodb");

const PageController = require("./PageController");

// PageController Object
// db.type is a string that determines the type of database
// db.client is the MongoDB client
class MongoPageController extends PageController {
  get requirements() {
    return [
      {
        name: 'slug',
        check: (param) => {
          if ( !this.paramTypes.string(param) ) {
            return false;
          }

          if (param.length <= 0) {
            return false;
          }

          return true;
        },
      },
      {
        name: 'content',
        check: this.paramTypes.array,
      },
    ];
  }

  /**
   * Gets a MongoDB Document based on the page slug sent.
   *
   * @param {String} slug The slug string with which to find the page.
   * @return {Promise} Returns a promise that resolves with an object.
   */
  async getPageBySlug(slug = "") {
    const collection = this.db.instance.db("kcms").collection("pages");
    return collection.findOne({
      slug,
    })
      .then((res) => {
        return res;
      });
  }

  getPublicPageList() {}

  getFullPageList() {}

  addPage(pageData = {}) {
    if (!this.checkAddParameters(pageData)) {
      return Promise.reject({
        msg: "Invalid Parameters sent",
      });
    }

    const db = this.db.instance.db("kcms").collection("pages");
    return db.updateOne(
      {
        slug: pageData.slug,
      },
      {
        $set: pageData,
      },
      {
        upsert: true,
      }
    );
    // return db.insertOne(pageData);
  }

  /**
   * Checks that the data that was sent to the addPage or editPage functions are
   * valid. Cycles through an array of require values and their types.
   *
   * @param {Object} params Data sent to the addPage function that's to be added to a document
   */
  checkAddParameters(params) {
    for (let x = 0, len = this.requirements.length; x < len; ++x) {
      const req = this.requirements[x];

      // We check that the name of the requirement exists in the parameters
      // sent. We run the check function attached to the requirement. If either
      // is false, we return false.
      if ( !(req.name in params)
        || !req.check(params[req.name])
      ) {
        return false;
      }
    }

    return true;
  }

  // eslint-disable-next-line no-unused-vars
  editPage(id, pageData = {}, authData = {}) {
    if (!this.checkAddParameters(pageData)) {
      return Promise.reject({
        msg: "Invalid Parameters sent",
      });
    }

    const db = this.db.instance.db("kcms").collection("pages");

    db.findOne({
      _id: ObjectId(id),
    })
      .then((res) => {
        console.log(res);
      });

    return db.updateOne(
      {
        _id: ObjectId(id),
      },
      {
        $set: pageData,
      }
    );
  }

  // eslint-disable-next-line no-unused-vars
  deletePage(pageData = {}) {}
}

module.exports = MongoPageController;
