import { $ } from "../app";

import { db, dbHelpers } from "../db.mock";

// GET /hello - returns a simple hello message
$.route("/hello", {
  get: $.op(
    {
      summary: "Say Hello",
      responses: {
        200: {
          description: "A hello world message",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" }
                }
              }
            }
          }
        }
      }
    },
    async () => {
      return { message: "Hello, world!" };
    },
  )
});

// GET /users - list all users (without password)
$.route("/users", {
  get: $.op(
    {
      summary: "List all users",
      parameters: <const>[
        {
          name: "role",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Filter users by role"
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1 },
          description: "Limit the number of users returned"
        }
      ],
      responses: {
        200: {
          description: "List of users",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: $.ref('#/components/schemas/User')
              }
            }
          }
        },
        404: $.ref('#/components/responses/NotFound')
      }
    },
    async (request, reply) => {
      // Extract query params
      const { role, limit } = request.query;
      if (typeof limit === 'string'){
        reply.status(400).send({error: "Limit must be an integer"});
        return {error: 'aas'};
      }
      
      let users = db.users;

      // Remove password from output
      let result = users.map(({ password, ...u }) => u);

      // Apply limit if provided
      if (limit && Number.isInteger(limit) && limit > 0) {
        result = result.slice(0, limit);
      }

      return result;
    }
  ),
  
});

$.route("/users", {
  post: $.op(
    <const>{
      summary: "Create a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                userId: { type: "integer" },
                title: { type: "string" },
                content: { type: "string" },
                birthday: { type: "string", format: "date-time" }
              },
              required: ["userId", "title", "content"]
            }
          }
        }
      },
      responses: {
        201: $.ref('#/components/responses/UserCreated')
      }
    },
    async (request, reply) => {
      const { username, email, password, role } = request.body as any;
      const user = dbHelpers.addUser({ username, email, password, role, createdAt: new Date().toISOString() });
      const { password: _, ...rest } = user;
      reply.code(201);
      return rest;
    }
  )
})

// GET /users/:id - get user by id (without password)
$.route("/users/:id", {
  get: $.op(
    <const>{
      summary: "Get user by id",
      parameters: <const>[
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" }
        }
      ],
      responses: {
        200: {
          description: "User object",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/User')
            }
          }
        },
        404: {
          description: "User not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = dbHelpers.getUserById(Number(id));
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }
      // Remove password
      const { password, ...rest } = user;
      return rest;
    }
  )
});

// GET /users/:id/posts - get posts by user id
$.route("/users/:id/posts", {
  get: $.op(
    {
      summary: "Get posts by user id",
      parameters: <const>[
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" }
        }
      ],
      responses: {
        200: {
          description: "List of posts",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    userId: { type: "integer" },
                    title: { type: "string" },
                    content: { type: "string" }
                  },
                  required: ['id', 'userId']
                }
              }
            }
          }
        }
      }
    },
    async (request) => {
      const { id } = request.params;
      // return {fish: 'horse'}
      if (process.env.FAIL_TEST_4==='true') return {fish:"horse"} as any
      return dbHelpers.getPostsByUserId(Number(id));
    }
  )
});

// POST /posts - create a new post
$.route("/posts", {
  post: $.op(
    {
      summary: "Create a new post",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                userId: { type: "integer", nullable: false },
                title: { type: "string", nullable: false },
                content: { type: "string", nullable: false }
              },
              required: ["userId", "title", "content"]
            }
          }
        }
      },
      responses: {
        201: {
          description: "Post created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  userId: { type: "integer" },
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { userId, title, content } = request.body as any;
      const post = dbHelpers.addPost({ userId, title, content });
      reply.code(201);
      return post;
    }
  )
});