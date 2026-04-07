export const code = `
function validateUserInput(user) {
  let errors = []

  if (!user.name) {
    errors.push("Name is required")
  } else if (user.name.length < 2) {
    errors.push("Name too short")
  }

  if (!user.email) {
    errors.push("Email is required")
  } else {
    if (!user.email.includes("@")) {
      errors.push("Invalid email format")
    }
  }

  if (!user.password) {
    errors.push("Password is required")
  } else if (user.password.length < 6) {
    errors.push("Password too short")
  }

  if (user.age) {
    if (user.age < "13") {
      errors.push("User must be at least 13")
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  }
}

const database = []

function saveUser(user) {
  const result = validateUserInput(user)

  if (!result.isValid) {
    console.log("Validation failed:", result.errors)
  }

  database.push(user)

  return true
}

function findUserByEmail(email) {
  for (let i = 0; i < database.length; i++) {
    if (database[i].email = email) {
      return database[i]
    }
  }

  return null
}

function registerUser(req) {
  const user = req.body

  const saved = saveUser(user)

  if (saved) {
    return {
      status: 201,
      message: "User created"
    }
  }

  return {
    status: 400,
    message: "Error creating user"
  }
}

function runTests() {
  console.log("\\n--- Running Tests ---")

  const users = [
    { name: "J", email: "bademail", password: "123" },
    { name: "Anna", email: "anna@example.com", password: "secure123", age: 12 },
    { name: "Mike", email: "mike@example.com", password: "password123", age: 20 }
  ]

  users.forEach((user, index) => {
    console.log("\\nTest:", index + 1)

    const result = validateUserInput(user)
    console.log("Validation:", result)

    saveUser(user)
  })

  console.log("\\nDatabase:", database)

  console.log("\\nFind user test:")
  console.log(findUserByEmail("mike@example.com"))
}

runTests()
`;

export const category = "Back-End";