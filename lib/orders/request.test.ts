import { describe, expect, it } from "vitest";
import {
  EMPTY_REQUEST,
  fieldErrors,
  normalizeTracNumber,
  parseOrderRequest,
  type RequestFields,
} from "./request";

const valid: RequestFields = {
  serviceType: "Fire safety inspection",
  address: "12 Main St, Springfield, IL",
  dueDate: "2026-11-15",
  notes: "Side door is unlocked.",
  tracNumber: "",
  name: "Sam Rivera",
  phone: "(555) 010-0100",
  email: "sam@example.com",
};

describe("fieldErrors", () => {
  it("accepts a complete request", () => {
    expect(fieldErrors(valid)).toEqual({});
  });

  it("lets the due date, notes and email be empty", () => {
    expect(fieldErrors({ ...valid, dueDate: "", notes: "", email: "" })).toEqual({});
  });

  it("lists every required field when the form is empty", () => {
    expect(Object.keys(fieldErrors(EMPTY_REQUEST)).sort()).toEqual(
      ["address", "name", "phone", "serviceType"].sort(),
    );
  });

  it("only accepts services from the list", () => {
    expect(fieldErrors({ ...valid, serviceType: "Roof repair" })).toEqual({
      serviceType: "Choose a service.",
    });
  });

  it("refuses dates that don't exist", () => {
    for (const dueDate of ["2026-02-30", "11/15/2026", "soon"]) {
      expect(fieldErrors({ ...valid, dueDate })).toEqual({
        dueDate: "Enter a real date, or leave it empty.",
      });
    }
  });

  it("needs 7 to 15 digits in the phone number, in any format", () => {
    for (const phone of ["555-0100", "+1 555 010 0100", "(555) 010-0100"]) {
      expect(fieldErrors({ ...valid, phone })).toEqual({});
    }
    for (const phone of ["12345", "call me", "1234567890123456"]) {
      expect(fieldErrors({ ...valid, phone }).phone).toBeDefined();
    }
  });

  it("refuses an email without an @ and a domain", () => {
    expect(fieldErrors({ ...valid, email: "sam@example" }).email).toBeDefined();
  });

  it("ignores spaces around what was typed", () => {
    expect(fieldErrors({ ...valid, name: "   " }).name).toBe("Enter your name.");
  });

  it("refuses text that's too long", () => {
    expect(fieldErrors({ ...valid, notes: "a".repeat(1001) })).toEqual({
      notes: "Keep this under 1000 characters.",
    });
  });
});

describe("parseOrderRequest", () => {
  it("turns a valid request into an order to save", () => {
    expect(parseOrderRequest({ ...valid, name: "  Sam Rivera " })).toEqual({
      ok: true,
      order: {
        serviceType: "Fire safety inspection",
        address: "12 Main St, Springfield, IL",
        dueDate: new Date("2026-11-15T12:00:00Z"),
        notes: "Side door is unlocked.",
        tracNumber: null,
        customer: { name: "Sam Rivera", phone: "(555) 010-0100", email: "sam@example.com" },
      },
    });
  });

  it("saves empty optional fields as null", () => {
    const result = parseOrderRequest({ ...valid, dueDate: "", notes: undefined, email: "" });
    expect(result.ok && result.order).toMatchObject({
      dueDate: null,
      notes: null,
      customer: { email: null },
    });
  });

  it("returns the first problem as the error, and all of them by field", () => {
    const result = parseOrderRequest({ ...valid, address: "", phone: "" });
    expect(result).toEqual({
      ok: false,
      error: "Enter the address where the work is needed.",
      fields: {
        address: "Enter the address where the work is needed.",
        phone: "Enter a phone number we can reach you on.",
      },
    });
  });

  it("refuses fields that aren't text, and bodies that aren't objects", () => {
    expect(parseOrderRequest({ ...valid, phone: 5550100 })).toMatchObject({
      ok: false,
      error: "phone must be text",
    });
    for (const body of [null, "hello", 5]) expect(parseOrderRequest(body).ok).toBe(false);
  });
});

describe("TRAC number", () => {
  const backflow = { ...valid, serviceType: "Backflow testing" };

  it("keeps just the digits, with or without a label", () => {
    expect(normalizeTracNumber("17408")).toBe("17408");
    expect(normalizeTracNumber(" TRAC# 17408 ")).toBe("17408");
    expect(normalizeTracNumber("trac no. 17408")).toBe("17408");
    expect(normalizeTracNumber("TRAC number: 1740 8")).toBe("17408");
    expect(normalizeTracNumber("17-408")).toBe("17408");
  });

  it("leaves anything that isn't digits for the check to reject", () => {
    expect(normalizeTracNumber("TRAC# 17A08")).toBe("17A08");
  });

  it("accepts any number of digits, up to 20", () => {
    expect(fieldErrors({ ...backflow, tracNumber: "17408" })).toEqual({});
    expect(fieldErrors({ ...backflow, tracNumber: "TRAC# 1740812" })).toEqual({});
    expect(fieldErrors({ ...backflow, tracNumber: "1".repeat(20) })).toEqual({});
    expect(fieldErrors({ ...backflow, tracNumber: "1".repeat(21) })).toHaveProperty("tracNumber");
  });

  it("refuses letters, and is optional", () => {
    expect(fieldErrors({ ...backflow, tracNumber: "ABC-17408" })).toHaveProperty("tracNumber");
    expect(fieldErrors({ ...backflow, tracNumber: "" })).toEqual({});
  });

  it("saves the digits for backflow testing", () => {
    const result = parseOrderRequest({ ...backflow, tracNumber: "TRAC# 17408" });
    expect(result.ok && result.order.tracNumber).toBe("17408");
  });

  it("ignores it for other services, where the field is hidden", () => {
    expect(fieldErrors({ ...valid, tracNumber: "not a number" })).toEqual({});
    const result = parseOrderRequest({ ...valid, tracNumber: "17408" });
    expect(result.ok && result.order.tracNumber).toBeNull();
  });
});
