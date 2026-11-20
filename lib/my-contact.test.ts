import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetContact, readContact, rememberContact } from "./my-contact";

/** A tiny in-memory stand-in for the browser's localStorage (Vitest runs without a browser). */
function fakeStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("remembered contact details", () => {
  beforeEach(() => vi.stubGlobal("localStorage", fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("is empty until something is remembered", () => {
    expect(readContact()).toBeNull();
  });

  it("remembers the name and phone, trimmed", () => {
    rememberContact({ name: " Sam Rivera ", phone: "555-0100 " });
    expect(readContact()).toEqual({ name: "Sam Rivera", phone: "555-0100" });
  });

  it("stores only the name and phone, even if given more", () => {
    rememberContact({ name: "Sam", phone: "555-0100", email: "sam@example.com" } as never);
    expect(localStorage.getItem("my-contact")).toBe('{"name":"Sam","phone":"555-0100"}');
  });

  it("forgets them", () => {
    rememberContact({ name: "Sam", phone: "555-0100" });
    forgetContact();
    expect(readContact()).toBeNull();
  });

  it("ignores stored data that isn't a name and phone", () => {
    for (const bad of ["not json", "[]", '"Sam"', '{"name":"Sam"}', '{"name":"","phone":"1"}']) {
      localStorage.setItem("my-contact", bad);
      expect(readContact()).toBeNull();
    }
  });

  it("copes with storage being blocked", () => {
    const blocked = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(readContact()).toBeNull();
    expect(() => rememberContact({ name: "Sam", phone: "555-0100" })).not.toThrow();
    expect(() => forgetContact()).not.toThrow();
  });
});
