export const code = `
function sanitizeInput(input) {
  let sanitized = input

  sanitized = sanitized.replace("<script>", "")
  sanitized = sanitized.replace("</script>", "")

  sanitized = sanitized.replace("<", "&lt;")
  sanitized = sanitized.replace(">", "&gt;")

  return sanitized
}

function containsScript(input) {
  return input.includes("<script>")
}

function handleUserInput(req) {
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