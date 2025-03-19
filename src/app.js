const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(express.json());

const port = 3000;

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

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ message: "Login successful", userId: user.id });
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (users.some((user) => user.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const newUser = {
    id: users.length + 1,
    username,
    password,
    books: [],
  };

  users.push(newUser);
  res
    .status(201)
    .json({ message: "User registered successfully", userId: newUser.id });
});

app.get("/api/books", isAuthenticated, (req, res) => {
  const userBooks = books.filter((book) => book.userId === req.userId);
  res.json(userBooks);
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

app.get("/api/books/filter", isAuthenticated, (req, res) => {
  const { category, borrower, dueDate } = req.query;
  const userId = req.userId;

  let filteredBooks = books.filter((book) => book.userId === userId);

  if (category) {
    filteredBooks = filteredBooks.filter((book) => book.category === category);
  }

  if (borrower) {
    filteredBooks = filteredBooks.filter((book) =>
      book.borrower.toLowerCase().includes(borrower.toLowerCase())
    );
  }

  if (dueDate) {
    const selectedDate = new Date(dueDate);
    filteredBooks = filteredBooks.filter((book) => {
      const bookDueDate = new Date(book.dueDate);
      return bookDueDate.toDateString() === selectedDate.toDateString();
    });
  }

  res.json(filteredBooks);
});

app.patch("/api/books/:id/return", isAuthenticated, (req, res) => {
  const bookId = parseInt(req.params.id);
  const userId = req.userId;

  const bookIndex = books.findIndex(
    (book) => book.id === bookId && book.userId === userId
  );

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  books[bookIndex].returned = true;
  res.json(books[bookIndex]);
});

app.get("/api/books/due-soon", isAuthenticated, (req, res) => {
  const today = new Date();
  const oneWeekLater = new Date();
  oneWeekLater.setDate(today.getDate() + 7);

  const dueSoonBooks = books.filter((book) => {
    return (
      book.userId === req.userId &&
      !book.returned &&
      book.dueDate >= today &&
      book.dueDate <= oneWeekLater
    );
  });

  res.json(dueSoonBooks);
});

app.get("/api/books/:id", isAuthenticated, (req, res) => {
  const bookId = parseInt(req.params.id);
  const userId = req.userId;

  const book = books.find(
    (book) => book.id === bookId && book.userId === userId
  );

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  res.json(book);
});

app.put("/api/books/:id", isAuthenticated, (req, res) => {
  const bookId = parseInt(req.params.id);
  const userId = req.userId;
  const { title, author, borrower, category, dueDate } = req.body;

  const bookIndex = books.findIndex(
    (book) => book.id === bookId && book.userId === userId
  );

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  books[bookIndex] = {
    ...books[bookIndex],
    title,
    author,
    borrower,
    category,
    dueDate: new Date(dueDate),
  };

  res.json(books[bookIndex]);
});

const server = app.listen(3000, () => {
  console.log("Book Lending System API running at http://localhost:3000");
});

module.exports = { app, server };
