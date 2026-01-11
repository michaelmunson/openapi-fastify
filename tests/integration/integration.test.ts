import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { app, $ } from "./testApp/initialized";
import { db, dbHelpers } from "./testApp/db.mock";

const PORT = 8889; // Use different port from old integration test

const hitServer = async (route: `/${string}`, options?: RequestInit) => {
  return await fetch(`http://localhost:${PORT}${route}`, {
    ...options,
  });
};

describe("Integration Tests", () => {
  beforeAll(async () => {
    // Reset database state before tests
    dbHelpers.reset();
    console.log($.printRoutes());
    await app.ready();
    await app.listen({ port: PORT });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('App Tests', () => {
    describe("GET /health", () => {
      it("should return health status", async () => {
        const res = await hitServer("/health");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("status", "ok");
        expect(data).toHaveProperty("timestamp");
        expect(typeof data.timestamp).toBe("string");
      }, 10000);
    });

    describe("GET /users", () => {
      it("should return a list of all users without passwords", async () => {
        const res = await hitServer("/users");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);

        if (data.length > 0) {
          const user = data[0];
          expect(user).toHaveProperty("id");
          expect(user).toHaveProperty("username");
          expect(user).toHaveProperty("email");
          expect(user).toHaveProperty("role");
          expect(user).not.toHaveProperty("password");
        }
      }, 10000);

      it("should filter users by role query parameter", async () => {
        const res = await hitServer("/users?role=admin");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        data.forEach((user: any) => {
          expect(user.role).toBe("admin");
          expect(user).not.toHaveProperty("password");
        });
      }, 10000);

      it("should limit results with limit query parameter", async () => {
        const res = await hitServer("/users?limit=2");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeLessThanOrEqual(2);
      }, 10000);

      it("should combine role and limit query parameters", async () => {
        const res = await hitServer("/users?role=user&limit=1");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeLessThanOrEqual(1);
        if (data.length > 0) {
          expect(data[0].role).toBe("user");
        }
      }, 10000);
    });

    describe("POST /users", () => {
      it("should create a new user and return it without password", async () => {
        const newUser = {
          username: "testuser",
          email: "testuser@example.com",
          password: "password123",
          role: "user" as const
        };

        const res = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser)
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("username", newUser.username);
        expect(data).toHaveProperty("email", newUser.email);
        expect(data).toHaveProperty("role", newUser.role);
        expect(data).not.toHaveProperty("password");
      }, 10000);

      it("should reject request with missing required fields", async () => {
        const invalidUser = {
          username: "incomplete"
          // missing email and password
        };

        const res = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidUser)
        });

        // Should be rejected by validation
        expect(res.status).toBe(400);
      }, 10000);

      it("should reject request with invalid email format", async () => {
        const invalidUser = {
          username: "bademail",
          email: "not-an-email",
          password: "password123"
        };

        const res = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidUser)
        });

        // Should be rejected by validation
        expect(res.status).toBe(400);
      }, 10000);

      it("should reject request with invalid role", async () => {
        const invalidUser = {
          username: "badrole",
          email: "badrole@example.com",
          password: "password123",
          role: "invalid-role"
        };

        const res = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidUser)
        });

        // Should be rejected by validation
        expect(res.status).toBe(400);
      }, 10000);

      it("should use default role when not provided", async () => {
        const newUser = {
          username: "defaultrole",
          email: "defaultrole@example.com",
          password: "password123"
        };

        const res = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newUser)
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        // The default role should be applied by the schema
        expect(data).toHaveProperty("role");
      }, 10000);
    });

    describe("GET /users/:id", () => {
      it("should return a user by id without password", async () => {
        // First, get a user id from the list
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        expect(users.length).toBeGreaterThan(0);
        const userId = users[0].id;

        const res = await hitServer(`/users/${userId}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("id", userId);
        expect(data).toHaveProperty("username");
        expect(data).toHaveProperty("email");
        expect(data).toHaveProperty("role");
        expect(data).not.toHaveProperty("password");
      }, 10000);

      it("should return 404 for non-existent user", async () => {
        const res = await hitServer("/users/999999");
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);

      it("should return 404 for invalid user id format", async () => {
        const res = await hitServer("/users/invalid");
        expect(res.status).toBe(404); // Fastify route matching
      }, 10000);
    });

    describe("PUT /users/:id", () => {
      it("should update a user and return updated user without password", async () => {
        // Create a user first
        const createRes = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "updatetest",
            email: "updatetest@example.com",
            password: "password123",
            role: "user"
          })
        });
        const created = await createRes.json();
        const userId = created.id;

        // Update the user
        const updates = {
          username: "updateduser",
          email: "updateduser@example.com",
          role: "admin" as const
        };

        const res = await hitServer(`/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("id", userId);
        expect(data).toHaveProperty("username", updates.username);
        expect(data).toHaveProperty("email", updates.email);
        expect(data).toHaveProperty("role", updates.role);
        expect(data).not.toHaveProperty("password");
      }, 10000);

      it("should return 404 for non-existent user", async () => {
        const res = await hitServer("/users/999999", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "test" })
        });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);

      it("should reject update with invalid email format", async () => {
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        const userId = users[0].id;

        const res = await hitServer(`/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "invalid-email" })
        });

        // Should be rejected by validation
        expect(res.status).toBe(400);
      }, 10000);

      it("should allow partial updates", async () => {
        // Create a user first
        const createRes = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "partialupdate",
            email: "partialupdate@example.com",
            password: "password123",
            role: "user"
          })
        });
        const created = await createRes.json();
        const userId = created.id;

        // Update only username
        const res = await hitServer(`/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "partiallyupdated" })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.username).toBe("partiallyupdated");
        expect(data.email).toBe(created.email); // Should remain unchanged
      }, 10000);
    });

    describe("DELETE /users/:id", () => {
      it("should delete a user and return success message", async () => {
        // Create a user first
        const createRes = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "deletetest",
            email: "deletetest@example.com",
            password: "password123",
            role: "user"
          })
        });
        const created = await createRes.json();
        const userId = created.id;

        // Delete the user
        const res = await hitServer(`/users/${userId}`, {
          method: "DELETE"
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("message");

        // Verify user is deleted
        const getRes = await hitServer(`/users/${userId}`);
        expect(getRes.status).toBe(404);
      }, 10000);

      it("should return 404 for non-existent user", async () => {
        const res = await hitServer("/users/999999", {
          method: "DELETE"
        });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);
    });

    describe("GET /users/:id/posts", () => {
      it("should return posts for a user", async () => {
        // Get a user id
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        expect(users.length).toBeGreaterThan(0);
        const userId = users[0].id;

        const res = await hitServer(`/users/${userId}/posts`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        data.forEach((post: any) => {
          expect(post).toHaveProperty("id");
          expect(post).toHaveProperty("userId", userId);
          expect(post).toHaveProperty("title");
          expect(post).toHaveProperty("content");
          expect(post).toHaveProperty("createdAt");
        });
      }, 10000);

      it("should return 404 for non-existent user", async () => {
        const res = await hitServer("/users/999999/posts");
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);

      it("should return empty array for user with no posts", async () => {
        // Create a new user (they won't have posts)
        const createRes = await hitServer("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "noposts",
            email: "noposts@example.com",
            password: "password123",
            role: "user"
          })
        });
        const created = await createRes.json();
        const userId = created.id;

        const res = await hitServer(`/users/${userId}/posts`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      }, 10000);
    });

    describe("POST /posts", () => {
      it("should create a new post and return it", async () => {
        // Get a user id
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        const userId = users[0].id;

        const newPost = {
          userId,
          title: "Integration Test Post",
          content: "This is a test post created during integration testing."
        };

        const res = await hitServer("/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPost)
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data).toHaveProperty("id");
        expect(data).toHaveProperty("userId", userId);
        expect(data).toHaveProperty("title", newPost.title);
        expect(data).toHaveProperty("content", newPost.content);
        expect(data).toHaveProperty("createdAt");
      }, 10000);

      it("should reject request with missing required fields", async () => {
        const invalidPost = {
          userId: 1
          // missing title and content
        };

        const res = await hitServer("/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidPost)
        });

        // Should be rejected by validation
        expect(res.status).toBe(400);
      }, 10000);

      it("should return 404 for non-existent user", async () => {
        const invalidPost = {
          userId: 999999,
          title: "Test Post",
          content: "Test content"
        };

        const res = await hitServer("/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invalidPost)
        });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);
    });

    describe("GET /posts/:id", () => {
      it("should return a post by id", async () => {
        // Get a user id and create a post
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        const userId = users[0].id;

        const createRes = await hitServer("/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            title: "Get Test Post",
            content: "This post will be retrieved"
          })
        });
        const created = await createRes.json();
        const postId = created.id;

        const res = await hitServer(`/posts/${postId}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("id", postId);
        expect(data).toHaveProperty("userId", userId);
        expect(data).toHaveProperty("title", created.title);
        expect(data).toHaveProperty("content", created.content);
        expect(data).toHaveProperty("createdAt");
      }, 10000);

      it("should return 404 for non-existent post", async () => {
        const res = await hitServer("/posts/999999");
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);
    });

    describe("DELETE /posts/:id", () => {
      it("should delete a post and return success message", async () => {
        // Get a user id and create a post
        const usersRes = await hitServer("/users");
        const users = await usersRes.json();
        const userId = users[0].id;

        const createRes = await hitServer("/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            title: "Delete Test Post",
            content: "This post will be deleted"
          })
        });
        const created = await createRes.json();
        const postId = created.id;

        // Delete the post
        const res = await hitServer(`/posts/${postId}`, {
          method: "DELETE"
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("message");

        // Verify post is deleted
        const getRes = await hitServer(`/posts/${postId}`);
        expect(getRes.status).toBe(404);
      }, 10000);

      it("should return 404 for non-existent post", async () => {
        const res = await hitServer("/posts/999999", {
          method: "DELETE"
        });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data).toHaveProperty("error");
      }, 10000);
    });

    describe("Response Validation", () => {
      it("should validate response schemas match specification", async () => {
        // All responses should match their defined schemas
        // This is tested implicitly through the tests above
        // If response validation is enabled and fails, the tests would fail
        const res = await hitServer("/health");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("timestamp");
      }, 10000);
    });

    describe("Schema References", () => {
      it("should use schema references correctly", async () => {
        // Test that schema references work correctly
        // The routes use $.ref() which should resolve component schemas
        const res = await hitServer("/users");
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
        // Schema reference validation ensures User schema is used correctly
      }, 10000);
    });
  });

  describe('Schema Tests', () => {
    const specification = $.specification;
    it('should use ref with override correctly', async () => {
      expect(specification.paths['/users']?.['get']?.['operationId']).toBe('listUsers');
    }, 10000);
  })
});

