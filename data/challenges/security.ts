export const code = `
function sanitizeInput(input) {
  // 🔴 DEBUG HERE (Bug 1)
  // What if input is null, undefined, or not a string?

  let sanitized = input

  // 🔴 DEBUG HERE (Bug 2)
  // Only removes first occurrence of <script> tag
  sanitized = sanitized.replace("<script>", "")
  sanitized = sanitized.replace("</script>", "")

  // 🔴 DEBUG HERE (Bug 3)
  // Incorrect escaping (order matters)
  sanitized = sanitized.replace("<", "&lt;")
  sanitized = sanitized.replace(">", "&gt;")

  return sanitized
}

function containsScript(input) {
  // 🔴 DEBUG HERE (Bug 4)
  // Case sensitivity issue (SCRIPT vs script)
  return input.includes("<script>")
}

function handleUserInput(req) {
  // 🔴 DEBUG HERE (Bug 5)
  // No check if req.body or req.body.input exists
  const rawInput = req.body.input

  const safeInput = sanitizeInput(rawInput)

  if (containsScript(safeInput)) {
    return {
      status: 400,
      message: "Malicious input detected"
    }
  }

  return {
    status: 200,
    data: safeInput
  }
}

function runTests() {
  console.log("\\n--- Running Security Tests ---")

  const tests = [
    "<script>alert('xss')</script>",
    "<SCRIPT>alert('xss')</SCRIPT>",
    "<div>Hello</div>",
    null,
    "<img src=x onerror=alert(1)>"
  ]

  tests.forEach((input, index) => {
    console.log("\\nTest:", index + 1)

    try {
      const result = sanitizeInput(input)
      console.log("Sanitized:", result)

      const response = handleUserInput({
        body: { input: input }
      })

      console.log("Response:", response)
    } catch (err) {
      console.log("Error:", err.message)
    }
  })
}

runTests()
`;

export const category = "Security";
