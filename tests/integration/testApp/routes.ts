import { $ } from "./app";
import { db, dbHelpers } from "./db.mock";

// GET /health - Simple health check endpoint
$.route("/health", {
  get: $.op(
    <const>{
      summary: "Health check",
      operationId: "healthCheck",
      responses: {
        200: {
          description: "Service is healthy",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  timestamp: { type: "string", format: "date-time" }
                }
              }
            }
          }
        }
      }
    },
    async () => {
      return {
        status: "ok",
        timestamp: new Date().toISOString()
      };
    }
  )
});

// GET /users - List all users
$.route("/users", {
  get: $.op(
    <const>{
      summary: "List all users",
      operationId: "listUsers",
      parameters: [
        {
          name: "role",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["user", "admin"] },
          description: "Filter users by role"
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 },
          description: "Limit the number of results"
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
        }
      }
    },
    async (request) => {
      const { role, limit } = request.query as { role?: string; limit?: number };
      
      // Get all users or filter by role
      let users = db.users;
      if (role) {
        users = dbHelpers.getUsersByRole(role as 'user' | 'admin');
      }
      
      // Remove password from response
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      
      if (limit && limit > 0) {
        return usersWithoutPassword.slice(0, limit);
      }
      
      return usersWithoutPassword;
    }
  ),
  
  post: $.op(
    <const>{
      summary: "Create a new user",
      operationId: "createUser",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: $.ref('#/components/schemas/CreateUserRequest')
          }
        }
      },
      responses: {
        201: {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/User')
            }
          }
        },
        400: $.ref('#/components/responses/BadRequest')
      }
    },
    async (request, reply) => {
      const { username, email, password, role = 'user' } = request.body as {
        username: string;
        email: string;
        password: string;
        role?: 'user' | 'admin';
      };
      
      // Check if user already exists
      if (dbHelpers.getUserByUsername(username)) {
        reply.code(400);
        return { error: "Username already exists" };
      }
      
      const user = dbHelpers.addUser({ username, email, password, role });
      const { password: _, ...userWithoutPassword } = user;
      
      reply.code(201);
      return userWithoutPassword;
    }
  )
});

// GET /users/:id - Get user by ID
$.route("/users/:id", {
  get: $.op(
    <const>{
      summary: "Get user by ID",
      operationId: "getUserById",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "User ID"
        }
      ],
      responses: {
        200: {
          description: "User details",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/User')
            }
          }
        },
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const user = dbHelpers.getUserById(Number(id));
      
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }
      
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
  ),
  
  put: $.op(
    <const>{
      summary: "Update user by ID",
      operationId: "updateUser",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "User ID"
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: $.ref('#/components/schemas/UpdateUserRequest')
          }
        }
      },
      responses: {
        200: {
          description: "User updated successfully",
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
              schema: $.ref('#/components/schemas/Error')
            }
          }
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/ValidationError')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const updates = request.body as {
        username?: string;
        email?: string;
        role?: 'user' | 'admin';
      };
      
      const user = dbHelpers.updateUser(Number(id), updates);
      
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }
      
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
  ),
  
  delete: $.op(
    <const>{
      summary: "Delete user by ID",
      operationId: "deleteUser",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "User ID"
        }
      ],
      responses: {
        200: {
          description: "User deleted successfully",
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
        },
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const deleted = dbHelpers.deleteUser(Number(id));
      
      if (!deleted) {
        reply.code(404);
        return { error: "User not found" };
      }
      
      return { message: "User deleted successfully" };
    }
  )
});

// GET /users/:id/posts - Get posts by user ID
$.route("/users/:id/posts", {
  get: $.op(
    <const>{
      summary: "Get posts by user ID",
      operationId: "getUserPosts",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "User ID"
        }
      ],
      responses: {
        200: {
          description: "List of posts",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: $.ref('#/components/schemas/Post')
              }
            }
          }
        },
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const user = dbHelpers.getUserById(Number(id));
      
      if (!user) {
        reply.code(404);
        return { error: "User not found" };
      }
      
      return dbHelpers.getPostsByUserId(Number(id));
    }
  )
});

// POST /posts - Create a new post
$.route("/posts", {
  post: $.op(
    <const>{
      summary: "Create a new post",
      operationId: "createPost",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: $.ref('#/components/schemas/CreatePostRequest')
          }
        }
      },
      responses: {
        201: {
          description: "Post created successfully",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Post')
            }
          }
        },
        400: $.ref('#/components/responses/BadRequest'),
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { userId, title, content } = request.body as {
        userId: number;
        title: string;
        content: string;
      };
      
      // Verify user exists
      if (!dbHelpers.getUserById(userId)) {
        reply.code(404);
        return { error: "User not found" };
      }
      
      const post = dbHelpers.addPost({ userId, title, content });
      reply.code(201);
      return post;
    }
  )
});

// GET /posts/:id - Get post by ID
$.route("/posts/:id", {
  get: $.op(
    <const>{
      summary: "Get post by ID",
      operationId: "getPostById",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "Post ID"
        }
      ],
      responses: {
        200: {
          description: "Post details",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Post')
            }
          }
        },
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const post = dbHelpers.getPostById(Number(id));
      
      if (!post) {
        reply.code(404);
        return { error: "Post not found" };
      }
      
      return post;
    }
  ),
  
  delete: $.op(
    <const>{
      summary: "Delete post by ID",
      operationId: "deletePost",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 },
          description: "Post ID"
        }
      ],
      responses: {
        200: {
          description: "Post deleted successfully",
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
        },
        404: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/Error')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as any;
      const deleted = dbHelpers.deletePost(Number(id));
      
      if (!deleted) {
        reply.code(404);
        return { error: "Post not found" };
      }
      
      return { message: "Post deleted successfully" };
    }
  )
});

