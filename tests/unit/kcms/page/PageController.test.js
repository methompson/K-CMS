const express = require("express");

const PageController = require("../../../../kcms/page/PageController");
const PluginHandler = require("../../../../kcms/plugin-handler");

const longString = `1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
                    1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890`;

describe("PageController", () => {
  let pc;
  let ph;
  let router;
  let req;
  let res;

  beforeEach(() => {
    router = express.Router();
    router.get.mockClear();
    router.post.mockClear();
    router.all.mockClear();
    req = { request: "" };
    res = { response: "" };

    ph = new PluginHandler();
    pc = new PageController(ph);
  });

  describe("Instantiation", () => {
    test("When a new PageController is instantiated, a pluginHandler and editors are added to the object's data. 5 routes are set", () => {
      expect(router.get).toHaveBeenCalledTimes(3);
      expect(router.get).toHaveBeenNthCalledWith(1, '/get-page/:pageId', expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(2, '/all-pages', expect.any(Function));
      expect(router.get).toHaveBeenNthCalledWith(3, '/:slug', expect.any(Function));

      expect(router.post).toHaveBeenCalledTimes(3);
      expect(router.post).toHaveBeenNthCalledWith(1, '/add-page', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(2, '/edit-page', expect.any(Function), expect.any(Function));
      expect(router.post).toHaveBeenNthCalledWith(3, '/delete-page', expect.any(Function), expect.any(Function));

      expect(pc.pluginHandler).toBe(ph);
    });

    test("When a PageController is instantiated without a PluginHandler or an invalid PluginHandler, a new one will be created", () => {
      pc = new PageController();
      expect(pc.pluginHandler instanceof PluginHandler).toBe(true);

      const obj = {};
      pc = new PageController(obj);
      expect(pc.pluginHandler instanceof PluginHandler).toBe(true);
      expect(pc.pluginHandler).not.toBe(obj);
    });

  });

  describe("routes", () => {
    test("routes will return the router", () => {
      expect(pc.routes).toBe(pc.router);
    });

    test("the /add-page route has two functions. The second function runs addPage", () => {
      const anonyFunc = router.post.mock.calls[0][2];

      const methodSpy = jest.spyOn(pc, "addPage")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /edit-page route has two functions. The second function runs editPage", () => {
      const anonyFunc = router.post.mock.calls[1][2];

      const methodSpy = jest.spyOn(pc, "editPage")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /delete-page route has two functions. The second function runs deletePage", () => {
      const anonyFunc = router.post.mock.calls[2][2];

      const methodSpy = jest.spyOn(pc, "deletePage")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /get-page/:pageId route has one function and it runs getPageById", () => {
      const anonyFunc = router.get.mock.calls[0][1];

      const methodSpy = jest.spyOn(pc, "getPageById")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /all-pages route has one function and it runs getAllPages", () => {
      const anonyFunc = router.get.mock.calls[1][1];

      const methodSpy = jest.spyOn(pc, "getAllPages")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

    test("the /:slug route has one function and it runs getPageBySlug", () => {
      const anonyFunc = router.get.mock.calls[2][1];

      const methodSpy = jest.spyOn(pc, "getPageBySlug")
        .mockImplementationOnce(() => {});

      anonyFunc(req, res);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenCalledWith(req, res);
    });

  });

  describe("checkAllowedUsersForSiteMod", () => {
    let authToken;

    beforeEach(() => {
      authToken = {
        userType: '',
      };
    });

    test("checkAllowedUserForSiteMod will return true when an authToken with a user included in the editors list is passed to the function", () => {
      authToken.userType = "admin";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(true);
      authToken.userType = "superAdmin";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(true);
      authToken.userType = "editor";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(true);
    });

    test("checkAllowedUserForSiteMod will return false when an authToken with a user not included in the editors list is passed to the function ", () => {
      authToken.userType = "viewer";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
      authToken.userType = "subscriber";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
      authToken.userType = "subAdmin";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
      authToken.userType = "notAdmin";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
      authToken.userType = "notsuperAdmin";
      expect(pc.checkAllowedUsersForSiteMod(authToken)).toBe(false);
    });

    test("checkAllowedUserForSiteMod will return false when an authToken without a usertype or a non-object is passed to the function ", () => {
      expect(pc.checkAllowedUsersForSiteMod({})).toBe(false);
      expect(pc.checkAllowedUsersForSiteMod(69)).toBe(false);
      expect(pc.checkAllowedUsersForSiteMod("69")).toBe(false);
      expect(pc.checkAllowedUsersForSiteMod(["69"])).toBe(false);
      expect(pc.checkAllowedUsersForSiteMod( () => {} )).toBe(false);
    });
  });

  describe("extractPageData", () => {
    test("extractPageData will return the page data object when it's incuded in the request's body", () => {
      const page = {};
      req.body = {
        page,
      };

      expect(pc.extractPageData(req)).toBe(page);
    });

    test("extractPageData will return null when the request object doesn't have a page or a body", () => {
      expect(pc.extractPageData(req)).toBe(null);

      req.body = 69;
      expect(pc.extractPageData(req)).toBe(null);

      req.body = {};
      expect(pc.extractPageData(req)).toBe(null);
    });

    test("extractPageData will return null when the request argument isn't an object", () => {
      expect(pc.extractPageData(69)).toBe(null);
      expect(pc.extractPageData("69")).toBe(null);
      expect(pc.extractPageData([69])).toBe(null);
      expect(pc.extractPageData(true)).toBe(null);
      expect(pc.extractPageData( () => {} )).toBe(null);
    });
  });

  describe("checkPageData", () => {
    let pd;
    beforeEach(() => {
      pd = {
        name: "name",
        enabled: true,
        slug: "name",
        content: [],
      };
    });

    test("checkPageData will return null if there are no errors with the pageData object sent to it", () => {
      expect(pc.checkPageData(pd)).toBe(null);
    });

    test("checkPageData will return an error if the pageData doesn't include specific keys", () => {
      const pd1 = { ...pd };
      const pd2 = { ...pd };
      const pd3 = { ...pd };
      const pd4 = { ...pd };

      delete pd1.name;
      delete pd2.enabled;
      delete pd3.slug;
      delete pd4.content;

      expect(pc.checkPageData(pd1)).toBe("Invalid Parameters Sent");
      expect(pc.checkPageData(pd2)).toBe("Invalid Parameters Sent");
      expect(pc.checkPageData(pd3)).toBe("Invalid Parameters Sent");
      expect(pc.checkPageData(pd4)).toBe("Invalid Parameters Sent");
    });

    test("checkPageData will return specific errors if the pageData values aren't the right type", () => {
      const pd1 = { ...pd };
      const pd2 = { ...pd };
      const pd3 = { ...pd };
      const pd4 = { ...pd };
      const pd5 = { ...pd };
      const pd6 = { ...pd };
      const pd7 = { ...pd };
      const pd8 = { ...pd };
      const pd9 = { ...pd };

      pd1.name = 69;
      pd2.enabled = 69;
      pd3.slug = 69;
      pd4.content = 69;
      pd5.name = "";
      pd6.name = longString;
      pd7.slug = "";
      pd8.slug = longString;
      pd9.slug = "~!#";

      expect(pc.checkPageData(pd1)).toBe("Invalid Name Type");
      expect(pc.checkPageData(pd2)).toBe("Invalid Page Data (Enabled)");
      expect(pc.checkPageData(pd3)).toBe("Invalid Slug Type");
      expect(pc.checkPageData(pd4)).toBe("Invalid Page Data");
      expect(pc.checkPageData(pd5)).toBe("Invalid Name Length");
      expect(pc.checkPageData(pd6)).toBe("Invalid Name Length");
      expect(pc.checkPageData(pd7)).toBe("Invalid Slug Length");
      expect(pc.checkPageData(pd8)).toBe("Invalid Slug Length");
      expect(pc.checkPageData(pd9)).toBe("Invalid Characters in Slug");
    });
  });

  describe("checkSlug", () => {
    test("checkSlug returns true if the values passed to it only include lower case alphabet, numbers and hyphens", () => {
      expect(pc.checkSlug("abcdefghijklmnopqrstuvwxyz1234567890-")).toBe(null);
    });

    test("checkSlug returns an error if the value passed to it includes any character other than lower case alphabet, number and hyphen", () => {
      expect(pc.checkSlug("abc&def")).toBe("Invalid Characters in Slug");
      expect(pc.checkSlug("abc+def")).toBe("Invalid Characters in Slug");
      expect(pc.checkSlug("abc%def")).toBe("Invalid Characters in Slug");
      expect(pc.checkSlug("abc$def")).toBe("Invalid Characters in Slug");
      expect(pc.checkSlug("abc#def")).toBe("Invalid Characters in Slug");
      expect(pc.checkSlug("abc@def")).toBe("Invalid Characters in Slug");
    });

    test("checkSlug returns an error if the value passed to it is not a string or an empty string", () => {
      expect(pc.checkSlug(69)).toBe("Invalid Slug Type");
      expect(pc.checkSlug(true)).toBe("Invalid Slug Type");
      expect(pc.checkSlug([])).toBe("Invalid Slug Type");
      expect(pc.checkSlug({})).toBe("Invalid Slug Type");
      expect(pc.checkSlug(() => {})).toBe("Invalid Slug Type");
    });

    test("checkSlug returns an error if the value passed to it is too short or too long", () => {
      expect(pc.checkSlug("")).toBe("Invalid Slug Length");
      expect(pc.checkSlug(longString)).toBe("Invalid Slug Length");
    });
  });

});
