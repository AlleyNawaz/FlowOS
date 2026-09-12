import { describe, expect, it } from "vitest";
import { classifyIntent, DEFAULT_PREFERENCES, extractSearchTerms, searchFiles } from "./flow";

describe("command intent routing", () => {
  it("routes natural-language file discovery", () => {
    expect(classifyIntent("Find the contract from John")).toBe("search");
    expect(extractSearchTerms("Please find my project contract document")).toBe("project contract");
  });

  it("recognizes actions that need future approval", () => {
    expect(classifyIntent("Clean my downloads folder")).toBe("organize");
    expect(classifyIntent("Prepare tomorrow's schedule")).toBe("schedule");
  });

  it("treats recency words as ranking signals instead of filename terms", () => {
    expect(extractSearchTerms("Find my latest project brief")).toBe("project brief");
    expect(extractSearchTerms("show the most recent tax document")).toBe("tax");
  });

  it("does not fabricate search results outside the desktop runtime", async () => {
    await expect(searchFiles("invoice", DEFAULT_PREFERENCES)).rejects.toThrow(
      "Local file search requires the FlowOS desktop application.",
    );
  });
});
