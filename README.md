# OpenAPI Fastify

A powerful TypeScript library that seamlessly integrates OpenAPI specifications with Fastify routing, providing type-safe API development with automatic validation and comprehensive documentation generation.

## [Full Documentation Here](https://michaelmunson.github.io/openapi-fastify/)

## Features

- **Full Typescript Support**: Full TypeScript support with compile-time type checking
- **OpenAPI Integration**: Native OpenAPI 3.0 specification support
- **Schema Validation**: Built-in request/response validation using AJV
- **Route Registration**: Simple, intuitive route definition syntax
- **Documentation Generation**: Automatic OpenAPI specification generation

## Installation

```bash
npm install openapi-fastify
```

## Quick Start

### Define you OpenAPI Specification
```typescript
// specifcation.ts

export const specification = <const>{ // (!) always use <const> here
  openapi: "3.0.0",
  info: {
    title: "My API",
    version: "1.0.0"
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          username: { type: 'string' },
          email: { type: 'string' }
        },
        required: ['id', 'username', 'email']
      }
    }
  }
};

```
### Instantiate your Fastify and OpenAPIRouter instances
```typescript
// app.ts
import Fastify from 'fastify';
import { OpenApiRouter } from 'openapi-fastify';
import { specification } from './specification';

export const app = Fastify();

export const router = new OpenApiRouter(app, specification, {
  autoValidate: {
    request: {
      validate: true // validate request body against schema
    },
    response: {
      validate: true // validate response against schema
    }
  },
  autoParse: {
    parameters: true // parse parameters (path, query, header)
  },
  specificationResolver: (spec) => spec // provide a custom spec resolver
});
```

### Define your Routes
```typescript
// routes/users.ts

import {router} from '../app'

router.route("/users", {
  post: router.op(
    <const>{
      summary: "Create a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: router.ref('#/components/schemas/User')
          }
        }
      },
      responses: {
        201: {
          description: "User created",
          content: {
            "application/json": {
              schema: router.ref('#/components/schemas/User')
            }
          }
        }
      }
    },
    async (request, reply) => {
      const user = request.body; // Fully typed!
      // Process user creation...
      reply.code(201);
      return user;
    }
  )
});
```
```typescript
// routes/index.ts

import './users'

```
### Initialize and Start
```typescript
import {app, router} from './app';
import './routes'; // (!) always remember to import your routes

router.initialize();

app.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
```

## API Reference

### OpenApiRouter

The main class for creating type-safe OpenAPI routes.

#### Constructor

```typescript
new OpenApiRouter<T>(app: FastifyInstance, document: T, options?: RouterOptions)
```

- `app`: Fastify instance
- `document`: OpenAPI specification document
- `options`: Optional configuration (see RouterOptions)

#### Methods

##### `route(path: string, methods: OperatorRecord)`

Registers a new route with the specified path and HTTP methods.

```typescript
router.route("/users/:id", {
  get: router.op(/* specification */, /* handler */),
  put: router.op(/* specification */, /* handler */),
  delete: router.op(/* specification */, /* handler */)
});
```

##### `op<T>(specification: T, handler: FromSpec.Method<T>)`

Creates an operation handler with OpenAPI specification and type-safe handler function.

```typescript
const operation = router.op(
  {
    summary: "Get user by ID",
    parameters: [
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
            schema: router.ref('#/components/schemas/User')
          }
        }
      }
    }
  },
  async (request, reply) => {
    const { id } = request.params; // Fully typed!
    // Implementation...
  }
);
```

##### `ref<S>(ref: S, options?: { useRef?: boolean, override?:Record<string,any> })`

Creates a reference to a schema in the OpenAPI document.

```typescript
// Get the actual schema object
const userSchema = router.ref('#/components/schemas/User');

// Get a $ref object, set required to ['id']
const userRef = router.ref('#/components/schemas/User', { useRef: true, override:{required: ['id']} });
```

##### `spec<T>(specification: T)`

Creates a new OpenAPI specification object.

```typescript
const spec = router.spec({
  summary: "Create a new user",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: router.ref('#/components/schemas/User')
      }
    }
  }
});
```

##### `handler<T>(handler: FromSpec.Method<T>)`

Creates a handler function with the specified OpenAPI specification.

```typescript
const handler = router.handler<typeof spec>(async (request) => {
  return { id: 1, username: "alice" };
});
```

##### `initialize()`

Initializes the router and registers all routes with Fastify.

```typescript
router.initialize();
```

##### `get specification`

Returns the complete OpenAPI specification including all registered routes.

```typescript
const spec = router.specification;
console.log(JSON.stringify(spec, null, 2));
```

## Configuration

### RouterOptions

```typescript
interface RouterOptions {
  specModifier?: (spec: OpenAPI.Operator) => OpenAPI.Operator;
  autoValidate?: {
    request?: {
      validate?: boolean;
      errorResponse?: {
        status: number;
        payload: Record<string, any> | ((errors: ErrorObject[]) => Record<string, any>);
      };
    };
    response?: {
      validate?: boolean;
      errorResponse?: {
        status: number;
        payload: Record<string, any> | ((errors: ErrorObject[]) => Record<string, any>);
      };
    };
  };
}
```

### Auto Validation

Enable automatic request and response validation:

```typescript
const router = new OpenApiRouter(app, openApiDoc, {
  autoValidate: {
    request: {
      validate: true,
      errorResponse: {
        status: 400,
        payload: { error: "Invalid request body", errors: [] }
      }
    },
    response: {
      validate: true,
      errorResponse: {
        status: 500,
        payload: { error: "Invalid response", errors: [] }
      }
    }
  }
});
```

## Advanced Usage

### Custom Schema Modifiers

```typescript
const router = new OpenApiRouter(app, openApiDoc, {
  specModifier: (spec) => ({
    ...spec,
    tags: ['api'],
    security: [{ bearerAuth: [] }]
  })
});
```

### Complex Route Definitions

```typescript
router.route("/users/:id/posts", {
  get: router.op(
    {
      summary: "Get posts by user ID",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" }
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100 }
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
                    title: { type: "string" },
                    content: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { limit } = request.query;
      // Implementation...
    }
  )
});
```

## Type Safety

The library provides full TypeScript support with compile-time type checking:

- **Request Parameters**: Automatically typed based on path parameters
- **Query Parameters**: Type-safe query parameter access
- **Request Body**: Fully typed request body based on OpenAPI schema
- **Response Types**: Response types inferred from OpenAPI specification
- **Handler Functions**: Type-safe handler function signatures

## Error Handling

Built-in error handling for validation failures:

```typescript
// Custom error responses
const router = new OpenApiRouter(app, openApiDoc, {
  autoValidate: {
    request: {
      validate: true,
      errorResponse: {
        status: 422,
        payload: (errors) => ({
          error: "Validation failed",
          details: errors
        })
      }
    }
  }
});
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Debug Mode
Enable debug logging by setting the `DEBUG_OPENAPI_FASTIFY` environment variable to `true` or `1`
```bash
DEBUG_OPENAPI_FASTIFY=true npm start
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please visit the [GitHub repository](https://github.com/michaelmunson/openapi-fastify).
