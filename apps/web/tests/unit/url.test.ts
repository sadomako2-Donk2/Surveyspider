import { describe, expect, it } from "vitest";
import { googleSiteVerification } from "@/lib/url";

describe("googleSiteVerification", () => {
  it("accepts the code alone or the whole tag Google shows", () => {
    expect(googleSiteVerification("abcDEF123_-xyz456")).toBe("abcDEF123_-xyz456");
    expect(googleSiteVerification('<meta name="google-site-verification" content="abcDEF123_-xyz456" />')).toBe(
      "abcDEF123_-xyz456",
    );
  });
  it("ignores missing or unexpected values", () => {
    expect(googleSiteVerification(undefined)).toBeUndefined();
    expect(googleSiteVerification("")).toBeUndefined();
    expect(googleSiteVerification('x" onload="alert(1)')).toBeUndefined();
  });
});
