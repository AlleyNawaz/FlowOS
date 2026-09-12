import { describe, expect, it } from "vitest";
import { classifyIntent, extractSearchTerms } from "./flow";

describe("command intent routing", () => {
  it("routes natural-language file discovery", () => {
    expect(classifyIntent("Find the contract from John")).toBe("search");
    expect(extractSearchTerms("Please find my project contract document")).toBe("project contract");
  });

  it("recognizes actions that need future approval", () => {
    expect(classifyIntent("Clean my downloads folder")).toBe("organize");
    expect(classifyIntent("Prepare tomorrow's schedule")).toBe("schedule");
  });
});
