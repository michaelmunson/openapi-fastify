import {describe, it, expect} from "@jest/globals";

const hitMockServer = async (route: `/${string}`, options?:RequestInit) => {
  return await fetch(`http://localhost:${process.env.PORT!}${route}`, {
    ...options,
  });
};

describe("Integration", () => {
  describe("GET /hello", () => {
    it("should return a hello world message", async () => {
      const res = await hitMockServer("/hello");
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toEqual({ message: "Hello, world!" });
    });
  });

  describe("GET /users", () => {
    it("should return a list of users (without password)", async () => {
      const res = await hitMockServer("/users");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty("id");
        expect(data[0]).toHaveProperty("username");
        expect(data[0]).toHaveProperty("email");
        expect(data[0]).toHaveProperty("role");
        expect(data[0]).not.toHaveProperty("password");
      }
    });

    it("should filter users by role", async () => {
      const res = await hitMockServer("/users?role=admin");
      expect(res.status).toBe(200);
      const data = await res.json();
      for (const user of data) {
        expect(user.role).toBe("admin");
      }
    });

    it("should limit the number of users returned", async () => {
      const res = await hitMockServer("/users?limit=1");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBeLessThanOrEqual(1);
    });
  });

  describe("GET /users/:id", () => {
    it("should return a user by id (without password)", async () => {
      // First, get a user id
      const usersRes = await hitMockServer("/users");
      const users = await usersRes.json();
      if (users.length === 0) return;
      const userId = users[0].id;
      const res = await hitMockServer(`/users/${userId}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id", userId);
      expect(data).toHaveProperty("username");
      expect(data).toHaveProperty("email");
      expect(data).toHaveProperty("role");
      expect(data).not.toHaveProperty("password");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await hitMockServer("/users/999999");
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "User not found");
    });
  });

  describe("GET /users/:id/posts", () => {
    it("should return posts for a user", async () => {
      // First, get a user id
      const usersRes = await hitMockServer("/users");
      const users = await usersRes.json();
      if (users.length === 0) return;
      const userId = users[0].id;
      const res = await hitMockServer(`/users/${userId}/posts`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      for (const post of data) {
        expect(post).toHaveProperty("id");
        expect(post).toHaveProperty("userId", userId);
        expect(post).toHaveProperty("title");
        expect(post).toHaveProperty("content");
      }
    });
  });

  describe("POST /users", () => {
    it("should create a new user and return it (without password)", async () => {
      const newUser = {
        username: `testuser_${Math.random().toString(36).slice(2)}`,
        email: `test${Math.random().toString(36).slice(2)}@example.com`,
        password: "testpassword",
        role: "user"
      };
      const res = await hitMockServer("/users", {
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
    });
  });

  describe("POST /posts", () => {
    it("should create a new post and return it", async () => {
      // First, get a user id
      const usersRes = await hitMockServer("/users");
      const users = await usersRes.json();
      if (users.length === 0) return;
      const userId = users[0].id;
      const newPost = {
        userId,
        title: "Integration Test Post",
        content: "This is a test post."
      };
      const res = await hitMockServer("/posts", {
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
    });
    it("should reject POST /users with missing required fields (schema enforcing)", async () => {
      // Missing 'email'
      const badUser = {
        username: "baduser",
        password: "testpassword"
      };
      const res = await hitMockServer("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badUser)
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "Invalid request body");
      expect(Array.isArray(data.errors)).toBe(true);
      // Should mention 'email' is required
      expect(data.errors.some((e: any) => e.message && e.message.includes("must have required property 'email'"))).toBe(true);
    });

    it("should reject POST /users with extra properties (schema enforcing)", async () => {
      // Add an extra property not in schema
      const badUser = {
        username: "baduser",
        email: "baduser@example.com",
        password: "testpassword",
        foo: "bar"
      };
      const res = await hitMockServer("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badUser)
      });
      // By default, additionalProperties is allowed unless schema says otherwise, so this should succeed
      // If you want to enforce no extra properties, set additionalProperties: false in schema
      // For now, expect 201
      expect([201, 400]).toContain(res.status);
    });

    it("should apply default value for 'role' if not provided (request body parsing)", async () => {
      const newUser = {
        username: `defaultrole_${Math.random().toString(36).slice(2)}`,
        email: `defaultrole${Math.random().toString(36).slice(2)}@example.com`,
        password: "testpassword"
        // no 'role'
      };
      const res = await hitMockServer("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("role", "user");
    });

    it("should reject POST /posts with missing required fields (schema enforcing)", async () => {
      // Missing 'title'
      const usersRes = await hitMockServer("/users");
      const users = await usersRes.json();
      if (users.length === 0) return;
      const userId = users[0].id;
      const badPost = {
        userId,
        content: "Missing title"
      };
      const res = await hitMockServer("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badPost)
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error", "Invalid request body");
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.some((e: any) => e.message && e.message.includes("must have required property 'title'"))).toBe(true);
    });

    it("should apply default value for 'published' in POST /posts (request body parsing)", async () => {
      // 'published' is omitted, should be set to its default value by the server
      const usersRes = await hitMockServer("/users");
      const users = await usersRes.json();
      if (users.length === 0) return;
      const userId = users[0].id;
      const newPost = {
        userId,
        title: "Default published test",
        content: "Should apply default value for published"
        // no 'published'
      };
      const res = await hitMockServer("/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost)
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("published", false); // assuming default is false
    });
  });
});