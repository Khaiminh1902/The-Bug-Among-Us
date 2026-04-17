import { fixedCodeTemplates } from "./index.ts";

const normalizeSource = (source: string) => source.replace(/\r\n/g, "\n");

type Validator = {
  bugId: number;
  check: (source: string) => boolean;
};

const validators: Record<string, Validator[]> = {
  "Front-End": [
    {
      bugId: 1,
      check: (source) =>
        source.includes('<div key={tab.name} style={{ fontWeight: "bold" }}>') &&
        source.includes("<div key={tab.name}>"),
    },
    {
      bugId: 2,
      check: (source) =>
        /function handleTabClick\(tabName\)\s*\{[\s\S]*setActiveTab\(tabName\)\s*\}/.test(
          source,
        ),
    },
    {
      bugId: 3,
      check: (source) => source.includes("if (tabs[i] === tabName)"),
    },
    {
      bugId: 4,
      check: (source) =>
        /function removeTab\(tabName\)\s*\{[\s\S]*if \(activeTab === tabName\) \{[\s\S]*setActiveTab\(updatedTabs\[0\] \|\| ""\)/.test(
          source,
        ),
    },
    {
      bugId: 5,
      check: (source) => source.includes('}, [activeTab])'),
    },
  ],
  "Back-End": [
    {
      bugId: 1,
      check: (source) =>
        /if \(!user\) \{[\s\S]*isValid: false,[\s\S]*errors: \["User data is required"\]/.test(
          source,
        ),
    },
    {
      bugId: 2,
      check: (source) => source.includes("if (user.age < 13)"),
    },
    {
      bugId: 3,
      check: (source) =>
        /if \(!result\.isValid\) \{[\s\S]*console\.log\("Validation failed:", result\.errors\)[\s\S]*return false[\s\S]*\}[\s\S]*database\.push\(user\)/.test(
          source,
        ),
    },
    {
      bugId: 4,
      check: (source) => source.includes("if (database[i].email === email)"),
    },
    {
      bugId: 5,
      check: (source) =>
        /if \(!req\.body\) \{[\s\S]*status: 400,[\s\S]*message: "Missing request body"/.test(
          source,
        ),
    },
  ],
  Security: [
    {
      bugId: 1,
      check: (source) =>
        /if \(typeof input !== "string"\) \{[\s\S]*return ""[\s\S]*\}/.test(source),
    },
    {
      bugId: 2,
      check: (source) =>
        source.includes('replace(/<script>/gi, "")') &&
        source.includes('replace(/<\\/script>/gi, "")'),
    },
    {
      bugId: 3,
      check: (source) =>
        source.includes('replace(/&/g, "&amp;")') &&
        source.includes('replace(/</g, "&lt;")') &&
        source.includes('replace(/>/g, "&gt;")'),
    },
    {
      bugId: 4,
      check: (source) => source.includes("return /<script>/i.test(input)"),
    },
    {
      bugId: 5,
      check: (source) =>
        source.includes("const rawInput = req?.body?.input") &&
        source.includes('message: "Input is required"'),
    },
  ],
  "Data Structures and Algorithms": [
    {
      bugId: 1,
      check: (source) =>
        /if \(!Array\.isArray\(arr\)\) \{[\s\S]*return \[-1, -1\][\s\S]*\}/.test(
          source,
        ),
    },
    {
      bugId: 2,
      check: (source) => source.includes("const complement = target - num"),
    },
    {
      bugId: 3,
      check: (source) =>
        source.includes("if (map[complement] !== undefined)") &&
        source.includes("return [map[complement], i]"),
    },
    {
      bugId: 4,
      check: (source) => source.includes("map[num] = i"),
    },
    {
      bugId: 5,
      check: (source) => source.includes("for (let j = i + 1; j < arr.length; j++)"),
    },
  ],
  "Object-Oriented Programming": [
    {
      bugId: 1,
      check: (source) =>
        source.includes("this.name = name") && source.includes("this.score = score"),
    },
    {
      bugId: 2,
      check: (source) =>
        source.includes('throw new Error("Points cannot be negative")'),
    },
    {
      bugId: 3,
      check: (source) => source.includes("if (!top || p.score > top.score)"),
    },
    {
      bugId: 4,
      check: (source) => source.includes("if (this.players[i].name === name)"),
    },
    {
      bugId: 5,
      check: (source) =>
        source.includes('throw new Error("Score must be a non-negative number")'),
    },
  ],
};

export function validateCodeProgress(category: string, source: string) {
  const normalizedSource = normalizeSource(source);
  const normalizedFixedSource = normalizeSource(fixedCodeTemplates[category] || "");
  const categoryValidators = validators[category] || [];
  const completedTasks = categoryValidators
    .filter(({ check }) => check(normalizedSource))
    .map(({ bugId }) => bugId);
  const exactMatch =
    normalizedFixedSource.length > 0 &&
    normalizedSource.trim() === normalizedFixedSource.trim();

  return {
    completedTasks,
    totalTasks: categoryValidators.length,
    remainingTasks: Math.max(categoryValidators.length - completedTasks.length, 0),
    isComplete:
      exactMatch ||
      (categoryValidators.length > 0 &&
        completedTasks.length === categoryValidators.length),
    exactMatch,
  };
}
