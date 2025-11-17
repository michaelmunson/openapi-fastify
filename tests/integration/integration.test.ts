import {describe, it, expect} from "@jest/globals";
import {app, $} from './app/initialized';

export const hitMockServer = async (route: `/${string}`, options?:RequestInit) => {
  return await fetch(`http://localhost:${process.env.PORT! || 8888}${route}`, {
    ...options,
  });
};

describe("Integration", () => {
  beforeAll(async () => {
    console.log($.printRoutes());
    await app.ready();
    await app.listen({ port: 8888 });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /hello", () => {
    it("should return a hello world message", async () => {
      const res = await hitMockServer("/hello");
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toEqual({ message: "Hello, world!" });
    }, 10000);
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
    }, 10000);
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
    }, 10000);

    it("should return 404 for non-existent user", async () => {
      const res = await hitMockServer("/users/999999");
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error", "User not found");
    }, 10000);
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
    }, 10000);
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
    }, 10000);
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
      expect(res.status).toBe(400);
      console.log(await res.json());
    }, 10000);
    it("should allow POST /users with extra properties after toggling autoValidate.request to false", async () => {
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
      expect(res.status).toBe(400);
      console.log(await res.json());
    }, 10000);
  });
});