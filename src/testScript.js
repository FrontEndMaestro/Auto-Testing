const assert = require("assert");
const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const users = [
  { id: 1, username: "user1", password: "password1", books: [] },
  { id: 2, username: "user2", password: "password2", books: [] },
];

const books = [];

const isAuthenticated = (req, res, next) => {
  const userId = req.headers["user-id"];
  if (!userId || !users.some((user) => user.id === parseInt(userId))) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.userId = parseInt(userId);
  next();
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (user) => user.username === username && user.password === password
  );
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ message: "Login successful", userId: user.id });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (users.some((user) => user.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }
  const newUser = { id: users.length + 1, username, password, books: [] };
  users.push(newUser);
  res
    .status(201)
    .json({ message: "User registered successfully", userId: newUser.id });
});

app.post("/api/books", isAuthenticated, (req, res) => {
  const { title, author, borrower, category, dueDate } = req.body;
  const newBook = {
    id: books.length + 1,
    userId: req.userId,
    title,
    author,
    borrower,
    category,
    dueDate: new Date(dueDate),
    lendDate: new Date(),
    returned: false,
  };
  books.push(newBook);
  res.status(201).json(newBook);
});

app.get("/api/books", isAuthenticated, (req, res) => {
  res.json(books.filter((book) => book.userId === req.userId));
});

app.get("/api/books/filter", isAuthenticated, (req, res) => {
  let filteredBooks = books.filter((book) => book.userId === req.userId);
  if (req.query.category) {
    filteredBooks = filteredBooks.filter(
      (book) => book.category === req.query.category
    );
  }
  res.json(filteredBooks);
});

app.patch("/api/books/:id/return", isAuthenticated, (req, res) => {
  const bookIndex = books.findIndex(
    (book) => book.id === parseInt(req.params.id) && book.userId === req.userId
  );
  if (bookIndex === -1)
    return res.status(404).json({ error: "Book not found" });
  books[bookIndex].returned = true;
  res.json(books[bookIndex]);
});

app.get("/api/books/due-soon", isAuthenticated, (req, res) => {
  const today = new Date();
  const oneWeekLater = new Date();
  oneWeekLater.setDate(today.getDate() + 7);
  res.json(
    books.filter(
      (book) =>
        book.userId === req.userId &&
        !book.returned &&
        book.dueDate >= today &&
        book.dueDate <= oneWeekLater
    )
  );
});

async function runTests() {
  console.log("Starting Book Lending System API Tests");

  try {
    const registerResponse = await new Promise((resolve, reject) => {
      request(app)
        .post("/api/register")
        .send({ username: "testuser", password: "testpass" })
        .end((err, res) => (err ? reject(err) : resolve(res)));
    });
    assert.strictEqual(registerResponse.statusCode, 201);
    const userId = registerResponse.body.userId;
    console.log("User Registration Test: PASSED");

    const bookResponse = await new Promise((resolve, reject) => {
      request(app)
        .post("/api/books")
        .set("user-id", userId)
        .send({
          title: "Test Book",
          author: "Test Author",
          borrower: "John Doe",
          category: "Fiction",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .end((err, res) => (err ? reject(err) : resolve(res)));
    });
    assert.strictEqual(bookResponse.statusCode, 201);
    console.log("Book Creation Test: PASSED");

    const getBooksResponse = await new Promise((resolve, reject) => {
      request(app)
        .get("/api/books")
        .set("user-id", userId)
        .end((err, res) => (err ? reject(err) : resolve(res)));
    });
    assert.strictEqual(getBooksResponse.statusCode, 200);
    assert(Array.isArray(getBooksResponse.body));
    console.log("Get Books Test: PASSED");

    const filterBooksResponse = await new Promise((resolve, reject) => {
      request(app)
        .get("/api/books/filter?category=Fiction")
        .set("user-id", userId)
        .end((err, res) => (err ? reject(err) : resolve(res)));
    });
    assert.strictEqual(filterBooksResponse.statusCode, 200);
    assert(Array.isArray(filterBooksResponse.body));
    console.log("Book Filtering Test: PASSED");

    const bookId = bookResponse.body.id;
    const returnBookResponse = await new Promise((resolve, reject) => {
      request(app)
        .patch(`/api/books/${bookId}/return`)
        .set("user-id", userId)
        .end((err, res) => (err ? reject(err) : resolve(res)));
    });
    assert.strictEqual(returnBookResponse.statusCode, 200);
    assert.strictEqual(returnBookResponse.body.returned, true);
    console.log("Book Return Test: PASSED");

    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
    process.exit(0);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = app;
