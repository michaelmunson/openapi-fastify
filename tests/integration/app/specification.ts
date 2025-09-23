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
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' }
        }
      }
    }
  }
};

export default specification;
