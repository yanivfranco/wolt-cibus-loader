import moment from "moment";
import { WoltCibusLoader } from "../src/WoltCibusLoader";
import { testConfig } from "./testConfig";
//10 min timeout
jest.setTimeout(moment.duration(10, "minutes").asMilliseconds());

describe("WoltCibusLoader", () => {
  let woltCibusLoader: WoltCibusLoader;
  beforeEach(() => {
    woltCibusLoader = new WoltCibusLoader(testConfig);
  });

  it("loadRemainingCibusBalanceToWolt", async () => {
    // Act
    await woltCibusLoader.loadRemainingCibusBalanceToWolt();
    expect(true).toBe(true);
  });
});
