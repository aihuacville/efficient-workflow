import { describe, expect, it } from "vitest";
import { EMPTY_REQUEST } from "../orders/request";
import {
  isEmptyAutofill,
  toIsoDate,
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
        tracNumber: "TRAC# 17408",
        notes: "Annual backflow test required. Ref #4471.",
      }),
    ).toEqual({
      serviceType: "Backflow testing",
      address: "12 Elm St, Springfield",
      dueDate: "2026-12-15",
      tracNumber: "17408",
      notes: "Annual backflow test required. Ref #4471.",
    });
  });

  it("empties values the form would reject", () => {
    expect(
      toAutofillFields({
        serviceType: "Chimney sweeping",
        address: "12",
        dueDate: "2026-02-30",
        tracNumber: "17408",
        notes: 42,
      }),
    ).toEqual({ serviceType: "", address: "", dueDate: "", tracNumber: "", notes: "" });
  });

  it("copes with an answer that isn't an object", () => {
    expect(toAutofillFields(null)).toEqual({
      serviceType: "",
      address: "",
      dueDate: "",
      tracNumber: "",
      notes: "",
    });
    expect(toAutofillFields("Backflow testing")).toEqual(toAutofillFields({}));
  });

  it("keeps a TRAC number only for backflow testing, and only digits", () => {
    const backflow = { serviceType: "Backflow testing", address: "12 Elm St" };
    expect(toAutofillFields({ ...backflow, tracNumber: "1740812" }).tracNumber).toBe("1740812");
    expect(toAutofillFields({ ...backflow, tracNumber: "TRAC# 17408" }).tracNumber).toBe("17408");
    expect(toAutofillFields({ ...backflow, tracNumber: "ACCT-2231" }).tracNumber).toBe("");
    expect(
      toAutofillFields({ serviceType: "Lawn care", address: "12 Elm St", tracNumber: "17408" })
        .tracNumber,
    ).toBe("");
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
      tracNumber: "",
      notes: "",
    });
    expect(fields.serviceType).toBe("Lawn care");
    expect(fields.address).toBe("12 Elm St");
    expect(filledIn).toEqual(["serviceType", "address"]);
  });

  it("never overwrites what the customer already typed", () => {
    const { fields, filledIn } = mergeAutofill(
      { ...EMPTY_REQUEST, address: "34 Oak Ave", name: "Sam" },
      { serviceType: "", address: "12 Elm St", dueDate: "", tracNumber: "", notes: "" },
    );
    expect(fields.address).toBe("34 Oak Ave");
    expect(fields.name).toBe("Sam");
    expect(filledIn).toEqual([]);
  });
});

describe("toIsoDate", () => {
  it("reads the date formats notices use, month first", () => {
    for (const printed of [
      "2026-12-15",
      "12/15/2026",
      "12-15-2026",
      "12.15.2026",
      "12/15/26",
      "December 15, 2026",
      "Dec 15 2026",
      "Dec. 15, 2026",
      "December 15th, 2026",
      "15 December 2026",
    ]) {
      expect(toIsoDate(printed), printed).toBe("2026-12-15");
    }
    expect(toIsoDate("1/5/2027")).toBe("2027-01-05");
  });

  it("refuses dates that don't exist, and dates without a day", () => {
    expect(toIsoDate("02/30/2026")).toBe("");
    expect(toIsoDate("13/01/2026")).toBe("");
    expect(toIsoDate("December 2026")).toBe("");
    expect(toIsoDate("Smarch 3, 2026")).toBe("");
    expect(toIsoDate("within 30 days")).toBe("");
    expect(toIsoDate("")).toBe("");
  });
});

describe("toAutofillFields due date", () => {
  it("keeps a due date written the way the notice prints it", () => {
    expect(toAutofillFields({ dueDate: "12/15/2026" }).dueDate).toBe("2026-12-15");
    // Longer than the form's 10-character field: must be read before it's shortened.
    expect(toAutofillFields({ dueDate: "December 15, 2026" }).dueDate).toBe("2026-12-15");
  });
});
