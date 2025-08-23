# OpenAPI Fastify Router

A TypeScript-first OpenAPI router for Fastify that provides full type safety and automatic OpenAPI specification generation.

## Features

- 🚀 **Type-Safe**: Full TypeScript support with automatic type inference
- 📝 **OpenAPI Integration**: Automatic OpenAPI specification generation
- ⚡ **Fastify Native**: Built specifically for Fastify with optimal performance
- 🛡️ **Schema Parsing & Enforcement**: Built-in parsing and validation of query parameters and request bodies according to your OpenAPI schemas
- 🔧 **Flexible**: Support for all HTTP methods and OpenAPI features
- 🎯 **Simple API**: Clean and intuitive API design

## Installation

```bash
npm install openapi-fastify
```

## Quick Start

### 1. Create your Fastify app

```typescript
import Fastify from 'fastify'
import { OpenApiRouter } from 'openapi-fastify'
import specification from './path/to/specification'

const app = Fastify()

export const $ = new OpenApiRouter(app, specification)

export default app
```

### 2. Define your routes

```typescript
$.route('/users/:user_id/data', {
  get: $.op({
    summary: 'Get user data',
    tags: ['user data'],
    parameters: <const>[
      {
        name: 'user_id',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: 'The ID of the user'
      },
      {
        name: 'include_details',
        in: 'query',
        required: false,
        schema: {
          type: 'boolean',
          default: false
        },
        description: 'Whether to include detailed user information'
      }
    ],
    responses: {
      200: {
        description: 'User data object',
        content: {
          'application/json': {
            schema: $.ref('#/components/schemas/UserData')
          }
        }
      }
    }
  }, async (request, reply) => {
    const { user_id } = request.params // fully typed
    const { include_details = false } = request.query // fully typed
    const userData = {
      id: user_id,
      name: "John Doe",
      email: "john.doe@example.com",
      details: include_details ? { age: 30, address: "123 Main St" } : undefined
    };
    return userData;
  }),
  post: $.op({
    summary: 'Create user data',
    tags: ['user data'],
    parameters: <const>[
      {
        name: 'user_id',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: 'The ID of the user'
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'The name of the user' },
              email: { type: 'string', description: 'The email of the user' },
              details: {
                type: 'object',
                properties: {
                  age: { type: 'integer', description: 'Age of the user' },
                  address: { type: 'string', description: 'Address of the user' }
                },
                required: []
              }
            },
            required: ['name', 'email']
          }
        }
      }
    },
    responses: {
      200: {
        description: 'The created user data',
        content: {
          'application/json': {
            schema: $.ref('#/components/schemas/UserData')
          }
        }
      }
    }
  }, async (request) => {
    const { user_id } = request.params as { user_id: string };
    const body = request.body // fully typed
    const createdUser = {
      id: user_id,
      ...body
    };
    return createdUser;
  })
});
```

### 3. Initialize and start your server

```typescript
import app, {$} from './app';
import './routes';

$.initialize();

const PORT = parseInt(process.env.PORT || '1234');

app.listen({ port: PORT }, (err) => {
  if (err) {
    console.log('ERROR', err);
    process.exit(1)
  }
  console.log(`SERVER:${PORT}`)
})
```

## API Reference

### OpenApiRouter

The main router class that handles route registration and OpenAPI integration.

#### Constructor

```typescript
new OpenApiRouter(app: FastifyInstance, document: OpenApiDocument, options?: RouterOptions)
```

**Parameters:**
- `app`: Fastify instance
- `document`: OpenAPI specification document
- `options`: Optional router configuration

#### Methods

##### `route(path: string, methods: MethodRecord)`

Registers a new route with the specified path and HTTP methods.

**Parameters:**
- `path`: Route path (supports path parameters)
- `methods`: Object containing HTTP method handlers

**Returns:** Route object

##### `op(specification: OpenApiPathOperator, handler: MethodFromSpec)`

Creates an operation handler with OpenAPI specification and type-safe handler function.

**Parameters:**
- `specification`: OpenAPI operation specification
- `handler`: Type-safe request handler function

**Returns:** Operator object

##### `ref(ref: string)`

Creates a reference to a schema in the OpenAPI document.

**Parameters:**
- `ref`: Schema reference string (e.g., `#/components/schemas/UserData`)

**Returns:** Referenced schema object

##### `initialize()`

Registers all routes with Fastify and returns the app instance.

**Returns:** Fastify instance

## Type Safety

The library provides full TypeScript support with automatic type inference:

### Request Parameters

Path parameters are automatically typed based on your OpenAPI specification:

```typescript
const { user_id } = request.params // Type: { user_id: string }
```

### Query Parameters

Query parameters are typed according to their schema:

```typescript
const { include_details } = request.query // Type: { include_details?: boolean }
```

### Request Body

Request body is typed based on the OpenAPI schema:

```typescript
const body = request.body // Type: { name: string; email: string; details?: { age: number; address: string } }
```

## Supported HTTP Methods

The library supports all standard HTTP methods:

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`
- `OPTIONS`
- `HEAD`

## OpenAPI Features

### Parameters

Support for all parameter types:
- Path parameters
- Query parameters
- Header parameters
- Cookie parameters

### Request Body

Full support for request body validation with JSON schema.

### Responses

Define multiple response types with different status codes and content types.

### Schema References

Use `$.ref()` to reference schemas defined in your OpenAPI document:

```typescript
schema: $.ref('#/components/schemas/UserData')
```

## Configuration Options

### RouterOptions

```typescript
interface RouterOptions {
  /**
   * A function that modifies the OpenAPI specification.
   * @param spec - The OpenAPI specification.
   * @returns The modified OpenAPI specification.
   */
  specModifier?: (spec: OpenApiPathOperator) => OpenApiPathOperator;
  
  /**
   * Whether to parse query parameters.
   * If true, the query parameters will be parsed according to that query parameter's schema type.
   * @default false
   */
  parseQueryParams?: boolean;
  
  /**
   * Whether to enforce the request body schema.
   * If true, the request body will be validated against the schema.
   * @default false
   */
  enforceRequestBodySchema?: boolean;
  
  /**
   * Whether to parse the request body.
   * If true, the request body will be parsed according to that request body's schema type.
   * This includes applying defaults to the request body.
   * @default false
   */
  parseRequestBody?: boolean;
}
```

#### Option Details

- **`specModifier`**: Optional function to modify OpenAPI specifications before registration
- **`parseQueryParams`**: When enabled, automatically converts query parameters to their proper types (string, integer, number, boolean) based on the OpenAPI schema
- **`enforceRequestBodySchema`**: When enabled, validates incoming request bodies against the OpenAPI schema and returns a 400 error if validation fails
- **`parseRequestBody`**: When enabled, applies default values from the OpenAPI schema to missing properties in the request body

#### Example Usage

```typescript
const $ = new OpenApiRouter(app, specification, {
  parseQueryParams: true,
  enforceRequestBodySchema: true,
  parseRequestBody: true
});
```

## Examples

### Basic CRUD Operations

```typescript
$.route('/users', {
  get: $.op({
    summary: 'List all users',
    responses: {
      200: {
        description: 'List of users',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: $.ref('#/components/schemas/User')
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return [{ id: '1', name: 'John' }];
  }),
  
  post: $.op({
    summary: 'Create a new user',
    requestBody: {
      content: {
        'application/json': {
          schema: $.ref('#/components/schemas/CreateUser')
        }
      }
    },
    responses: {
      201: {
        description: 'User created',
        content: {
          'application/json': {
            schema: $.ref('#/components/schemas/User')
          }
        }
      }
    }
  }, async (request) => {
    const userData = request.body;
    return { id: '2', ...userData };
  })
});
```

### Complex Parameters

```typescript
$.route('/search', {
  get: $.op({
    summary: 'Search with complex parameters',
    parameters: <const>[
      {
        name: 'q',
        in: 'query',
        required: true,
        schema: { type: 'string' }
      },
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1 }
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 10, maximum: 100 }
      },
      {
        name: 'filters',
        in: 'query',
        required: false,
        schema: { type: 'string' } // JSON string
      }
    ],
    responses: {
      200: {
        description: 'Search results',
        content: {
          'application/json': {
            schema: $.ref('#/components/schemas/SearchResults')
          }
        }
      }
    }
  }, async (request) => {
    const { q, page = 1, limit = 10, filters } = request.query;
    // All parameters are fully typed
    return { results: [], total: 0, page, limit };
  })
});
```