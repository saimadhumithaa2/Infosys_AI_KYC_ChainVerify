import { describe, it, expect } from "vitest";
import { hashMetadata, canonicalStringify } from "./hash";

describe("hashMetadata", () => {
  it("is deterministic for the same object", () => {
    const a = hashMetadata({ a: 1, b: "x" });
    const b = hashMetadata({ b: "x", a: 1 });
    expect(a.bytes32).toBe(b.bytes32);
  });

  it("canonicalizes key order", () => {
    expect(canonicalStringify({ z: 1, a: 2 })).toBe(canonicalStringify({ a: 2, z: 1 }));
  });
});
