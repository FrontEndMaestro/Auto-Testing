const request = require("supertest");
const app = require("./src/app");

describe("Book Lending System API", () => {
  let userId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/register")
      .send({ username: "testuser", password: "testpass" });

    expect(res.statusCode).toBe(201);
    userId = res.body.userId;
  });

  afterAll(() => {
    server.close();
  });

  test("User login", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "testpass" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("userId");
  });

  test("Add a book", async () => {
    const res = await request(app)
      .post("/api/books")
      .set("user-id", userId)
      .send({
        title: "The Alchemist",
        author: "Paulo Coelho",
        borrower: "John Doe",
        category: "Fiction",
        dueDate: "2025-04-01",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  test("Get books", async () => {
    const res = await request(app).get("/api/books").set("user-id", userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("Filter books by category", async () => {
    const res = await request(app)
      .get("/api/books/filter?category=Fiction")
      .set("user-id", userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("Return a book", async () => {
    const books = await request(app).get("/api/books").set("user-id", userId);

    const bookId = books.body[0]?.id;
    if (bookId) {
      const res = await request(app)
        .patch(`/api/books/${bookId}/return`)
        .set("user-id", userId);

      expect(res.statusCode).toBe(200);
      expect(res.body.returned).toBe(true);
    } else {
      console.warn("No books available for return test.");
    }
  });

  test("Get books due soon", async () => {
    const res = await request(app)
      .get("/api/books/due-soon")
      .set("user-id", userId);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
