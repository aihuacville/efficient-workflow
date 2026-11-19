import { describe, expect, it } from "vitest";
import { EMPTY_REQUEST } from "../orders/request";
import {
  isEmptyAutofill,
  MAX_PHOTO_BYTES,
  mergeAutofill,
  photoProblem,
  toAutofillFields,
} from "./notice";

describe("photoProblem", () => {
  it("accepts a JPEG of a normal size", () => {
    expect(photoProblem({ type: "image/jpeg", size: 400_000 })).toBeNull();
  });

  it("refuses other file types, empty files and very large photos", () => {
    expect(photoProblem({ type: "application/pdf", size: 1000 })).toMatch(/JPEG/);
    expect(photoProblem({ type: "image/heic", size: 1000 })).toMatch(/JPEG/);
    expect(photoProblem({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(photoProblem({ type: "image/png", size: MAX_PHOTO_BYTES + 1 })).toMatch(/too large/);
  });
});

describe("toAutofillFields", () => {
  it("keeps a complete, valid answer", () => {
    expect(
      toAutofillFields({
        serviceType: "Backflow testing",
        address: "  12 Elm St,\n Springfield ",
        dueDate: "2026-12-15",
        notes: "Annual backflow test required. Ref #4471.",
      }),
    ).toEqual({
      serviceType: "Backflow testing",
      address: "12 Elm St, Springfield",
      dueDate: "2026-12-15",
      notes: "Annual backflow test required. Ref #4471.",
    });
  });

  it("empties values the form would reject", () => {
    expect(
      toAutofillFields({
        serviceType: "Chimney sweeping",
        address: "12",
        dueDate: "2026-02-30",
        notes: 42,
      }),
    ).toEqual({ serviceType: "", address: "", dueDate: "", notes: "" });
  });

  it("copes with an answer that isn't an object", () => {
    expect(toAutofillFields(null)).toEqual({
      serviceType: "",
      address: "",
      dueDate: "",
      notes: "",
    });
    expect(toAutofillFields("Backflow testing")).toEqual(toAutofillFields({}));
  });

  it("shortens values that are too long for the form", () => {
    expect(toAutofillFields({ notes: "x".repeat(5000) }).notes).toHaveLength(1000);
  });

  it("never fills in contact details, even if the answer has them", () => {
    const fields = toAutofillFields({ name: "Jo", phone: "555 0100", address: "12 Elm St" });
    expect(fields).not.toHaveProperty("name");
    expect(fields).not.toHaveProperty("phone");
  });
});

describe("isEmptyAutofill", () => {
  it("is true only when nothing was filled in", () => {
    expect(isEmptyAutofill(toAutofillFields({}))).toBe(true);
    expect(isEmptyAutofill(toAutofillFields({ serviceType: "Lawn care" }))).toBe(false);
  });
});

describe("mergeAutofill", () => {
  it("fills empty fields and reports which ones", () => {
    const { fields, filledIn } = mergeAutofill(EMPTY_REQUEST, {
      serviceType: "Lawn care",
      address: "12 Elm St",
      dueDate: "",
      notes: "",
    });
    expect(fields.serviceType).toBe("Lawn care");
    expect(fields.address).toBe("12 Elm St");
    expect(filledIn).toEqual(["serviceType", "address"]);
  });

  it("never overwrites what the customer already typed", () => {
    const { fields, filledIn } = mergeAutofill(
      { ...EMPTY_REQUEST, address: "34 Oak Ave", name: "Sam" },
      { serviceType: "", address: "12 Elm St", dueDate: "", notes: "" },
    );
    expect(fields.address).toBe("34 Oak Ave");
    expect(fields.name).toBe("Sam");
    expect(filledIn).toEqual([]);
  });
});
