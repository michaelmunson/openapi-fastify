const specification = <const>{
  openapi: "3.0.0",
  info: {
    title: "Hello World API",
    version: "1.0.0",
    description: "A simple Hello World OpenAPI specification"
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'User not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      },
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

export default specification;
