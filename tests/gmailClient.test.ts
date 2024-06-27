import moment from "moment";
import { GmailClient } from "../src/gmailClient";

//5 min timeout
jest.setTimeout(moment.duration(5, "minutes").asMilliseconds());

describe("GmailClient", () => {
  let gmailClient: GmailClient;
  beforeEach(() => {
    gmailClient = new GmailClient();
  });

  it("getCodeFromGiftCardEmail", async () => {
    // Arrange
    const since = moment().subtract(2, "days"); // Adjust this to the date of the email

    // Act
    const code = await gmailClient.getCodeFromGiftCardEmail(since);

    console.log("Found code: ", code);

    // Assert
    expect(code).toBeTruthy();
  });
});
