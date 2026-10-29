import { describe, expect, it } from "vitest";
import { guessTitle, splitClauses } from "@/lib/ingest/clauses";
import { detectKind } from "@/lib/ingest/kind";
import { mask, remask, unmask, unmaskDeep } from "@/lib/ingest/mask";
import { sampleInsurance } from "@/lib/samples/insurance";
import { sampleRental } from "@/lib/samples/rental";
import { locateQuote } from "@/lib/verify";

const RENTAL_TEXT = `LEAVE AND LICENCE AGREEMENT

1. PARTIES
This Agreement is made between Mr. R. Narayan ("the Licensor") and Ms. Kavita Rao ("the Licensee").

2. Term: The licence is granted for a period of eleven (11) months commencing from 1 December 2026.

3.1 The Licensee shall pay a monthly licence fee of ₹28,000 on or before the 5th day of each month.
3.2 Any delay in payment shall attract a late charge of ₹500 per day of delay.

4. SECURITY DEPOSIT
The Licensee shall pay an interest-free security deposit equivalent to ten (10) months' licence fee,
refundable within sixty (60) days of vacating the premises, subject to deductions at the Licensor's
sole discretion.

Signed:`;

describe("splitClauses", () => {
  const clauses = splitClauses(RENTAL_TEXT);

  it("splits on numbered clauses and keeps their numbers", () => {
    expect(clauses.map((c) => c.number)).toEqual(["1", "2", "3.1", "3.2", "4"]);
  });

  it("takes headings from heading-only lines and inline labels", () => {
    expect(clauses[0].heading).toBe("Parties");
    expect(clauses[1].heading).toBe("Term");
    expect(clauses[4].heading).toBe("Security deposit");
  });

  it("joins lines broken by the PDF and keeps all the text", () => {
    expect(clauses[4].text).toContain("subject to deductions at the Licensor's\nsole discretion");
    expect(clauses[4].text).toContain("Signed:");
  });

  it("gives every clause a unique id", () => {
    expect(new Set(clauses.map((c) => c.id)).size).toBe(clauses.length);
  });

  it("falls back to paragraphs for unnumbered documents", () => {
    const text = "First paragraph about rent that is long enough to stand alone as a clause.\n\nSecond paragraph about the deposit, also long enough to count as its own clause.\n\nThird paragraph about notice periods and what happens when someone leaves early.";
    const out = splitClauses(text);
    expect(out).toHaveLength(3);
    expect(out[0].number).toBe("¶1");
  });

  it("does not treat years or amounts at the start of a line as clause numbers", () => {
    const text = "1. Rent\nThe rent is due monthly.\n2. Deposit\nThe deposit is two months.\n2026 rates apply to all renewals of this agreement.\n3. Notice\nOne month's notice.";
    expect(splitClauses(text).map((c) => c.number)).toEqual(["1", "2", "3"]);
  });

  it("reads model-transcribed scans: markdown headings, and no text lost at 'Rs.'", () => {
    const scan =
      "This agreement is made at Jaipur between Shri Mahesh Gupta and Ms. Priya Nair.\n**1. RENT**\nThe Tenant shall pay Rs. 15,000 per month by the 5th.\n**2. SECURITY DEPOSIT**\nA deposit of Rs. 45,000 will be forfeited if the Tenant leaves early.\n**3. ELECTRICITY**\nElectricity shall be charged at Rs. 12 per unit, as decided by the Owner.";
    const out = splitClauses(scan);
    expect(out.map((c) => c.number)).toEqual(["¶1", "1", "2", "3"]);
    expect(out[1]).toMatchObject({ heading: "Rent", text: "The Tenant shall pay Rs. 15,000 per month by the 5th." });
    expect(out[3].text).toBe("Electricity shall be charged at Rs. 12 per unit, as decided by the Owner.");
  });

  it("never drops words, whatever the layout", () => {
    const words = (s: string) =>
      s
        .replace(/[*#]/g, " ")
        .split(/\s+/)
        .map((w) => w.replace(/[.:,;]+$/, ""))
        .filter(Boolean);
    const docs = [
      RENTAL_TEXT,
      "The Tenant shall pay Rs. 15,000 per month. Mr. Rao is the Owner. Deposit No. 4 is held. Notice is one month. Repairs are shared.",
      "Term: eleven months.\n\nRent. The rent is Rs. 9,000.\n\nNOTICE. One month by either party.",
    ];
    for (const full of docs) {
      // A leading title line is shown as the document title, not as a clause.
      const doc = guessTitle(full) ? full.slice(full.indexOf("\n") + 1) : full;
      const kept = words(splitClauses(full).map((c) => c.text).join(" "));
      const headings = splitClauses(full).flatMap((c) => words(c.heading));
      for (const w of words(doc).filter((w) => !/^\d+(\.\d+)*[.)]?$/.test(w))) expect([...kept, ...headings].some((k) => k.toLowerCase() === w.toLowerCase()), w).toBe(true);
    }
  });

  it("guesses a title from the first line", () => {
    expect(guessTitle(RENTAL_TEXT)).toBe("Leave and licence agreement");
  });
});

describe("detectKind", () => {
  it("recognises the three document types", () => {
    expect(detectKind(sampleRental.clauses.map((c) => c.text).join("\n"))).toBe("rental");
    expect(detectKind("The sum insured, premium, co-payment and waiting period for each claim under this policy.")).toBe(
      "insurance",
    );
    expect(detectKind("The Employee's salary, notice period and non-compete obligations to the Employer.")).toBe("contract");
  });
});

describe("mask", () => {
  const text =
    "Mr. R. Narayan (PAN ABCDE1234F, Aadhaar 2345 6789 0123) can be reached on +91 98450 12345 or narayan@example.com. Rent goes to A/c No. 123456789012, IFSC HDFC0001234. Mr. R. Narayan will refund the deposit.";
  const { masked, map } = mask(text);

  it("replaces every personal detail", () => {
    for (const secret of ["Narayan", "ABCDE1234F", "2345 6789 0123", "98450 12345", "narayan@example.com", "123456789012", "HDFC0001234"]) {
      expect(masked).not.toContain(secret);
    }
  });

  it("keeps the same placeholder for repeated values and keeps titles", () => {
    expect(masked.match(/Mr\. \[NAME 1\]/g)).toHaveLength(2);
  });

  it("leaves amounts and dates alone", () => {
    const { masked: m } = mask("Rent of ₹28,000 is due by 5 December 2026; deposit ₹2,80,000.");
    expect(m).toBe("Rent of ₹28,000 is due by 5 December 2026; deposit ₹2,80,000.");
  });

  it("round-trips through unmask", () => {
    expect(unmask(masked, map)).toBe(text);
    expect(unmaskDeep({ a: [masked] }, map)).toEqual({ a: [text] });
  });

  it("masks earlier chat turns again with the same placeholders", () => {
    expect(remask("Ask R. Narayan about the deposit, or call +91 98450 12345.", map)).toBe(
      "Ask [NAME 1] about the deposit, or call [PHONE 1].",
    );
  });
});

describe("locateQuote", () => {
  const clause = "The Licensee shall pay a deposit, refundable within sixty (60) days, subject to deductions at the Licensor's sole\ndiscretion.";

  it("finds exact quotes", () => {
    expect(locateQuote(clause, "refundable within sixty (60) days")).toBe("refundable within sixty (60) days");
  });

  it("tolerates whitespace, curly quotes and case, and returns the document's own wording", () => {
    expect(locateQuote(clause, "Subject to deductions at the Licensor’s sole discretion")).toBe(
      "subject to deductions at the Licensor's sole\ndiscretion",
    );
  });

  it("uses the longest piece of an elided quote", () => {
    expect(locateQuote(clause, "shall pay a deposit … at the Licensor's sole discretion")).toBe(
      "at the Licensor's sole\ndiscretion",
    );
  });

  it("rejects quotes that aren't in the clause", () => {
    expect(locateQuote(clause, "the deposit is non-refundable")).toBeNull();
  });

  it("verifies every quote in the sample data", () => {
    for (const f of sampleRental.findings) {
      const clause = sampleRental.clauses.find((c) => c.id === f.clauseId)!;
      expect(locateQuote(clause.text, f.quote), f.id).toBe(f.quote);
    }
    expect(sampleInsurance.rows.length).toBeGreaterThan(0);
  });
});
