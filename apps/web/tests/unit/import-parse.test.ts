import { describe, expect, it } from "vitest";
import { parseQuestionnaire } from "@/lib/import/parse";

const types = (lines: string[]) => parseQuestionnaire(lines, "File").questions.map((q) => [q.type, q.text, q.options]);

describe("reading questionnaires (Phase 1 parser)", () => {
  it("finds numbered questions with lettered options and a title", () => {
    const r = parseQuestionnaire(
      [
        "Customer survey",
        "Thanks for your help.",
        "1. How often do you shop online?",
        "a) Daily",
        "b) Weekly",
        "c) Monthly",
        "2. What would make you shop more?",
      ],
      "fallback",
    );
    expect(r.title).toBe("Customer survey");
    expect(r.description).toBe("Thanks for your help.");
    expect(r.questions.map((q) => [q.type, q.text, q.options])).toEqual([
      ["SINGLE", "How often do you shop online?", ["Daily", "Weekly", "Monthly"]],
      ["TEXT", "What would make you shop more?", []],
    ]);
  });

  it("recognises checkboxes, Likert scales, numbered scales and number questions", () => {
    expect(
      types([
        "1. Which products did you buy? (select all that apply)",
        "• Groceries",
        "• Clothing",
        "2. I would recommend this store.",
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
        "3. How satisfied are you?",
        "1",
        "2",
        "3",
        "4",
        "5",
        "4. How many people live in your household?",
        "5. On a scale of 0 to 10, how likely are you to recommend us?",
      ]),
    ).toEqual([
      ["MULTI", "Which products did you buy? (select all that apply)", ["Groceries", "Clothing"]],
      [
        "LIKERT",
        "I would recommend this store.",
        ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
      ],
      ["RATING", "How satisfied are you?", []],
      ["NUMBER", "How many people live in your household?", []],
      ["RATING", "On a scale of 0 to 10, how likely are you to recommend us?", []],
    ]);
    const r = parseQuestionnaire(
      ["1. How satisfied are you?", "1", "2", "3", "4", "5", "2. On a scale of 0 to 10, how likely are you?"],
      "x",
    );
    expect(r.questions.map((q) => q.scale && [q.scale.min, q.scale.max])).toEqual([
      [1, 5],
      [0, 10],
    ]);
  });

  it("reads inline tick boxes and drops page numbers", () => {
    expect(types(["Do you smoke? ☐ Yes ☐ No", "Page 2", "3 of 5", "Why or why not?"])).toEqual([
      ["SINGLE", "Do you smoke?", ["Yes", "No"]],
      ["TEXT", "Why or why not?", []],
    ]);
  });

  it("uses Word list and heading markers", () => {
    const r = parseQuestionnaire(
      ["\u0003Staff survey", "\u0001Which team are you in?", "\u0002Sales", "\u0002Finance", "\u0001Anything else?"],
      "x",
    );
    expect(r.title).toBe("Staff survey");
    expect(r.questions.map((q) => [q.type, q.options])).toEqual([
      ["SINGLE", ["Sales", "Finance"]],
      ["TEXT", []],
    ]);
  });

  it("falls back to the file name and invents nothing when no questions are found", () => {
    expect(parseQuestionnaire(["Just a note."], "notes")).toEqual({
      title: "Just a note.",
      description: "",
      questions: [],
    });
    expect(parseQuestionnaire([], "notes").title).toBe("notes");
  });
});
