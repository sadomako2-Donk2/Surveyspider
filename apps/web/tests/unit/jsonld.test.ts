import { describe, expect, it } from "vitest";
import { courseLd } from "@/components/site/JsonLd";
import { bingSiteVerification } from "@/lib/url";

describe("search-engine details", () => {
  it("describes a course with Afrimetrica as the provider", () => {
    const ld = courseLd({ id: "ls-strategy", title: "Strategy", summary: "Plan and lead." }, "https://example.test");
    expect(ld).toMatchObject({
      "@type": "Course",
      name: "Strategy",
      url: "https://example.test/training/course/ls-strategy",
      provider: { "@type": "Organization", name: "Afrimetrica" },
    });
  });
  it("accepts a Bing ownership code alone or as the pasted tag", () => {
    expect(bingSiteVerification("ABCDEF0123456789ABCDEF0123456789")).toBe("ABCDEF0123456789ABCDEF0123456789");
    expect(bingSiteVerification('<meta name="msvalidate.01" content="ABCDEF0123456789" />')).toBe("ABCDEF0123456789");
    expect(bingSiteVerification('bad" value')).toBeUndefined();
  });
});
