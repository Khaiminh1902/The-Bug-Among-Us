import {
  category as frontendCategory,
  fixedCode as frontendFixedCode,
} from "./frontend.ts";
import {
  category as backendCategory,
  fixedCode as backendFixedCode,
} from "./backend.ts";
import {
  category as securityCategory,
  fixedCode as securityFixedCode,
} from "./security.ts";
import {
  category as dsaCategory,
  fixedCode as dsaFixedCode,
} from "./dsa.ts";
import {
  category as oopCategory,
  fixedCode as oopFixedCode,
} from "./oop.ts";

const buildGuide = (title: string, steps: string[], fixedCode: string) =>
  `// ${title} Fix Guide
// This file is read-only.
// Use it as a reference while editing the main challenge file.

OVERVIEW
This challenge has 5 bugs. Fix each item below in the editable file, then press "Run Code".

CHECKLIST
${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

REFERENCE
The validated solution for this category is shown below.

${fixedCode.trim()}
`;

export const guideTemplates: Record<string, string> = {
  [frontendCategory]: buildGuide(
    "Front-End",
    [
      "In renderTabs, add a stable key to every returned <div>. Use tab.name as the key for both the active and inactive branch.",
      "In handleTabClick, update state with setActiveTab(tabName). Calling highlightActiveTab alone does nothing because it does not store the selected tab.",
      "In findTabIndex, replace the assignment operator with a strict comparison: tabs[i] === tabName.",
      "In removeTab, if the removed tab is currently active, immediately select a safe fallback such as updatedTabs[0] || \"\".",
      "In useEffect, include activeTab in the dependency array so the effect reacts to tab changes.",
    ],
    frontendFixedCode,
  ),
  [backendCategory]: buildGuide(
    "Back-End",
    [
      "At the top of validateUserInput, guard against null or undefined user input and return an invalid result instead of crashing.",
      "Compare age as a number, not a string. Change the check to user.age < 13.",
      "In saveUser, stop early when validation fails. Do not push invalid users into the database array.",
      "In findUserByEmail, replace the assignment with a strict comparison: database[i].email === email.",
      "In registerUser, verify req.body exists before reading it. Return a 400 response when the request body is missing.",
    ],
    backendFixedCode,
  ),
  [securityCategory]: buildGuide(
    "Security",
    [
      "In sanitizeInput, guard against non-string input before calling string methods.",
      "Remove every script tag occurrence, not just the first one. Use global, case-insensitive replacements for both opening and closing script tags.",
      "Escape ampersands before escaping angle brackets so encoded output stays correct.",
      "In containsScript, make the detection case-insensitive so uppercase SCRIPT tags are caught too.",
      "In handleUserInput, safely read req?.body?.input and return a 400 response when the input is missing or invalid.",
    ],
    securityFixedCode,
  ),
  [dsaCategory]: buildGuide(
    "Data Structures and Algorithms",
    [
      "At the top of both pair-sum functions, return [-1, -1] when arr is not an array.",
      "Compute the complement correctly with target - num.",
      "Check whether the complement is already stored in the map. If it is, return that stored index and the current index.",
      "Store the current number as the key and the current index as the value: map[num] = i.",
      "In the brute-force solution, start the inner loop at i + 1 so the same index is never reused.",
    ],
    dsaFixedCode,
  ),
  [oopCategory]: buildGuide(
    "Object-Oriented Programming",
    [
      "Inside the Player constructor, assign both this.name and this.score.",
      "In addScore, reject negative points before updating the score.",
      "In getTopPlayer, pick the player with the highest score, not the lowest one.",
      "In findPlayer, replace the assignment with a strict comparison: this.players[i].name === name.",
      "In createPlayer, validate that score is a non-negative number before constructing the player.",
    ],
    oopFixedCode,
  ),
};
