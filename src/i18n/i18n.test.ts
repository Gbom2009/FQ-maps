import { describe, expect, it } from "vitest";
import nl from "./nl.json";
import en from "./en.json";

describe("i18n", () => {
  it("nl and en have the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(nl).sort());
  });
});
