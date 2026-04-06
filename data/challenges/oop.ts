export const code = `
class Player {
  constructor(name, score) {
    // 🔴 DEBUG HERE (Bug 1)
    // name and score are not assigned to the instance

  }

  getScore() {
    return this.score
  }

  addScore(points) {
    // 🔴 DEBUG HERE (Bug 2)
    // No validation for points (negative or not a number)

    this.score += points
  }

  resetScore() {
    this.score = 0
  }
}

class ScoreBoard {
  constructor() {
    this.players = []
  }

  addPlayer(player) {
    this.players.push(player)
  }

  getTopPlayer() {
    let top = null

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i]

      // 🔴 DEBUG HERE (Bug 3)
      // Comparison logic is incorrect
      if (!top || p.score < top.score) {
        top = p
      }
    }

    return top
  }

  findPlayer(name) {
    for (let i = 0; i < this.players.length; i++) {
      // 🔴 DEBUG HERE (Bug 4)
      // Assignment instead of comparison
      if (this.players[i].name = name) {
        return this.players[i]
      }
    }

    return null
  }
}

function createPlayer(name, score) {
  // 🔴 DEBUG HERE (Bug 5)
  // Missing validation for invalid score (negative or non-number)
  return new Player(name, score)
}

function runTests() {
  console.log("\\n--- Running Tests ---")

  const p1 = createPlayer("Alice", 100)
  const p2 = createPlayer("Bob", 50)
  const p3 = createPlayer("Charlie", 200)

  const board = new ScoreBoard()

  board.addPlayer(p1)
  board.addPlayer(p2)
  board.addPlayer(p3)

  console.log("Top player:", board.getTopPlayer())

  const found = board.findPlayer("Bob")
  console.log("Found player:", found)

  p1.addScore(20)
  console.log("Alice score after adding:", p1.getScore())

  p2.resetScore()
  console.log("Bob score after reset:", p2.getScore())
}

runTests()
`;

export const category = "Object-Oriented Programming";
