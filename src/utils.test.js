const {
  numApps,
  masSearch,
  caskSearch,
  caskInstall,
  masInstall
} = require("./utils");

describe("utility functions", () => {
  describe("numApps", () => {
    it("can total only if mas is present", () => {
      expect(
        numApps({
          mas: [{ name: "test", id: 290904940 }]
        })
      ).toBe(1);
    });
    it("can total only if cask is present", () => {
      expect(
        numApps({
          cask: ["slack"]
        })
      ).toBe(1);
    });
    it("fails as no keys are present", () => {
      expect(numApps({})).toBe(0);
    });
    it("can total if both cask and mas is present", () => {
      expect(
        numApps({
          cask: ["slack"],
          mas: [{ name: "test", id: 290904940 }]
        })
      ).toBe(2);
    });
  });
});

describe("search", () => {
  beforeAll(() => {
    jest.setTimeout(15000);
  });
  describe("cask", () => {
    it("can search for single app with no errors", async () => {
      const res = await caskSearch("slack");
      expect(res).toBeInstanceOf(Array);
    });
  });
  describe("mas", () => {
    it("can search for single app with no errors", async () => {
      const res = await masSearch("twitter");
      expect(res).toBeInstanceOf(Array);
    });
  });
  afterAll(() => {
    jest.setTimeout(5000);
  });
});

if (!process.env.CI) {
  describe("install", () => {
    beforeAll(() => {
      jest.setTimeout(30 * 1000);
    });
    describe("cask", () => {
      it("can install a single app", async () => {
        const res = await caskInstall("slack");
        expect(res).toEqual([{ app: "slack", installed: true }]);
      });
      it("can install an array of apps", async () => {
        const res = await caskInstall(["slack", "vlc"]);
        expect(res).toEqual([
          { app: "slack", installed: true },
          { app: "vlc", installed: true }
        ]);
      });
    });
    describe("mas", () => {
      it("can install a single app", async () => {
        const res = await masInstall({ name: "Pocket", id: "568494494" });
        expect(res).toEqual([{ app: "Pocket", installed: true }]);
      });
      it("can install an array of apps", async () => {
        const res = await masInstall([
          {
            name: "Pocket",
            id: "568494494"
          },
          {
            id: "412529613",
            name: "Cinch"
          }
        ]);
        expect(res).toEqual([
          { app: "Pocket", installed: true },
          { app: "Cinch", installed: true }
        ]);
      });
    });
    afterAll(() => {
      jest.setTimeout(5000);
    });
  });
}
