export type Task = {
  category: string;
  bugId: number;
  description: string;
  line: string;
};

export const bugTasks: Task[] = [
  {
    category: "Front-End",
    bugId: 1,
    description: "Missing key prop when rendering lists",
    line: "17",
  },
  {
    category: "Front-End",
    bugId: 2,
    description: "State not updated when clicking a tab",
    line: "34-35",
  },
  {
    category: "Front-End",
    bugId: 3,
    description: "Assignment instead of comparison",
    line: "40",
  },
  {
    category: "Front-End",
    bugId: 4,
    description: "Removing tab should handle activeTab",
    line: "48-49",
  },
  {
    category: "Front-End",
    bugId: 5,
    description: "useEffect missing dependency",
    line: "52",
  },
  {
    category: "Back-End",
    bugId: 1,
    description: "Null/undefined user not handled",
    line: "8",
  },
  {
    category: "Back-End",
    bugId: 2,
    description: "Type comparison issue (number vs string)",
    line: "26",
  },
  {
    category: "Back-End",
    bugId: 3,
    description: "Invalid users should not be saved",
    line: "41",
  },
  {
    category: "Back-End",
    bugId: 4,
    description: "Assignment instead of comparison",
    line: "48",
  },
  {
    category: "Back-End",
    bugId: 5,
    description: "Missing req.body check",
    line: "53",
  },
  {
    category: "Security",
    bugId: 1,
    description: "Null/undefined input not handled",
    line: "3",
  },
  {
    category: "Security",
    bugId: 2,
    description: "Only removes first script tag occurrence",
    line: "5-6",
  },
  {
    category: "Security",
    bugId: 3,
    description: "Incorrect escaping order",
    line: "8-9",
  },
  {
    category: "Security",
    bugId: 4,
    description: "Case sensitivity issue",
    line: "12",
  },
  {
    category: "Security",
    bugId: 5,
    description: "Missing req.body.input check",
    line: "16-17",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 1,
    description: "Null/non-array input not handled",
    line: "3",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 2,
    description: "Wrong complement calculation",
    line: "9",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 3,
    description: "Checking condition incorrectly",
    line: "12-13",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 4,
    description: "Storing wrong value in map",
    line: "16",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 5,
    description: "Should not reuse same index",
    line: "24",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 1,
    description: "Constructor not assigning properties",
    line: "2-3",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 2,
    description: "No validation for negative points",
    line: "8",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 3,
    description: "Comparison logic incorrect",
    line: "31",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 4,
    description: "Assignment instead of comparison",
    line: "39",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 5,
    description: "Missing score validation",
    line: "47",
  },
];

export const sabotageTasks: Task[] = [
  {
    category: "Front-End",
    bugId: 1,
    description: "Add infinite loop in renderTabs",
    line: "16-32",
  },
  {
    category: "Front-End",
    bugId: 2,
    description: "Remove tab state update",
    line: "34-35",
  },
  {
    category: "Front-End",
    bugId: 3,
    description: "Add wrong comparison operator",
    line: "40",
  },
  {
    category: "Front-End",
    bugId: 4,
    description: "Break highlightActiveTab function",
    line: "6-14",
  },
  {
    category: "Front-End",
    bugId: 5,
    description: "Add memory leak in useEffect",
    line: "52-54",
  },
  {
    category: "Back-End",
    bugId: 1,
    description: "Remove user validation completely",
    line: "8-25",
  },
  {
    category: "Back-End",
    bugId: 2,
    description: "Keep string comparison bug",
    line: "26-27",
  },
  {
    category: "Back-End",
    bugId: 3,
    description: "Save all users regardless of validation",
    line: "41-42",
  },
  {
    category: "Back-End",
    bugId: 4,
    description: "Return wrong user from database",
    line: "48-49",
  },
  {
    category: "Back-End",
    bugId: 5,
    description: "Add crash on missing req.body",
    line: "53-54",
  },
  {
    category: "Security",
    bugId: 1,
    description: "Remove null check causing crash",
    line: "3",
  },
  {
    category: "Security",
    bugId: 2,
    description: "Only filter first script tag",
    line: "5-6",
  },
  {
    category: "Security",
    bugId: 3,
    description: "Escape AFTER removing scripts",
    line: "8-9",
  },
  {
    category: "Security",
    bugId: 4,
    description: "Keep case-sensitive check",
    line: "12",
  },
  {
    category: "Security",
    bugId: 5,
    description: "Crash on undefined input",
    line: "16-17",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 1,
    description: "Remove array check causing crash",
    line: "3",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 2,
    description: "Use wrong formula",
    line: "9",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 3,
    description: "Return wrong indices",
    line: "12-13",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 4,
    description: "Store wrong value in map",
    line: "16",
  },
  {
    category: "Data Structures and Algorithms",
    bugId: 5,
    description: "Allow self-pair in brute force",
    line: "24",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 1,
    description: "Remove constructor assignment",
    line: "2-3",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 2,
    description: "Allow negative score",
    line: "8",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 3,
    description: "Reverse top player comparison",
    line: "31",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 4,
    description: "Assignment in findPlayer",
    line: "39",
  },
  {
    category: "Object-Oriented Programming",
    bugId: 5,
    description: "Allow negative score in createPlayer",
    line: "47",
  },
];

export function getTasksForCategory(cat: string): Task[] {
  return bugTasks.filter((t) => t.category === cat);
}

export function getSabotageTasksForCategory(cat: string): Task[] {
  return sabotageTasks.filter((t) => t.category === cat);
}