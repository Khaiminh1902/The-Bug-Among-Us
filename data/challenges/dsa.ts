export const code = `
function findPairSum(arr, target) {
  // 🔴 DEBUG HERE (Bug 1)
  // What if arr is null or not an array?
  const map = {}

  for (let i = 0; i < arr.length; i++) {
    const num = arr[i]

    // 🔴 DEBUG HERE (Bug 2)
    // Wrong complement calculation
    const complement = target + num

    // 🔴 DEBUG HERE (Bug 3)
    // Checking condition incorrectly
    if (map[num]) {
      return [map[num], i]
    }

    // 🔴 DEBUG HERE (Bug 4)
    // Storing wrong value in map
    map[i] = num
  }

  return [-1, -1]
}

function findPairSumBrute(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i; j < arr.length; j++) {
      // 🔴 DEBUG HERE (Bug 5)
      // Should not reuse same index
      if (arr[i] + arr[j] === target) {
        return [i, j]
      }
    }
  }

  return [-1, -1]
}

function runTests() {
  console.log("\\n--- Running Tests ---")

  const tests = [
    { arr: [2, 7, 11, 15], target: 9 },
    { arr: [3, 2, 4], target: 6 },
    { arr: [3, 3], target: 6 },
    { arr: [], target: 5 },
    { arr: null, target: 10 }
  ]

  tests.forEach((test, index) => {
    console.log("\\nTest:", index + 1)

    try {
      const result1 = findPairSum(test.arr, test.target)
      const result2 = findPairSumBrute(test.arr, test.target)

      console.log("Input:", test)
      console.log("Optimized:", result1)
      console.log("Brute:", result2)
    } catch (err) {
      console.log("Error:", err.message)
    }
  })
}

runTests()
`;

export const category = "Data Structures and Algorithms";
