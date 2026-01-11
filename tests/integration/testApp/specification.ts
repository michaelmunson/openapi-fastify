const specification = <const>{
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
    description: "Comprehensive test API for OpenAPI Fastify Router"
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'admin'] }
        },
        required: ['id', 'username', 'email', 'role']
      },
      CreateUserRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['user', 'admin'], default: 'user' }
        },
        required: ['username', 'email', 'password']
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'admin'] }
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          userId: { type: 'number' },
          title: { type: 'string' },
          content: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'userId', 'title', 'content']
      },
      CreatePostRequest: {
        type: 'object',
        properties: {
          userId: { type: 'number' },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          content: { type: 'string', minLength: 1 }
        },
        required: ['userId', 'title', 'content']
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['error']
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          errors: {
            type: 'array',
            items: { type: 'object' }
          }
        },
        required: ['error']
      }
    },
    responses: {
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            }
          }
        }
      }
    }
  }
};

export default specification;

