// Base type converter with support for more primitive types
export type StringTypeToType<T> = 
  T extends 'string' ? string 
  : T extends 'number' ? number 
  : T extends 'integer' ? number
  : T extends 'boolean' ? boolean 
  : T extends 'null' ? null
  : T extends 'array' ? any[]
  : T extends 'object' ? Record<string, any>
  : any;

// Helper type for intersection (allOf support)
type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void 
    ? I 
    : never;

// Depth limit to prevent infinite recursion
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

// Main schema converter with depth tracking
export type SchemaToType<Schema, Depth extends number = 10> = 
  [Depth] extends [never]
    ? any
  
  // Handle references ($ref) - would need external resolution
  : Schema extends { $ref: string }
    ? any
  
  // Handle allOf (intersection) - simplified
  : Schema extends { allOf: [infer A, infer B] }
    ? SchemaToType<A, Prev[Depth]> & SchemaToType<B, Prev[Depth]>
  : Schema extends { allOf: [infer A, infer B, infer C] }
    ? SchemaToType<A, Prev[Depth]> & SchemaToType<B, Prev[Depth]> & SchemaToType<C, Prev[Depth]>
  : Schema extends { allOf: [infer A, ...infer Rest] }
    ? SchemaToType<A, Prev[Depth]> & SchemaToType<{ allOf: Rest }, Prev[Depth]>
  
  // Handle anyOf/oneOf (union) - simplified
  : Schema extends { anyOf: [infer A, infer B] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<B, Prev[Depth]>
  : Schema extends { anyOf: [infer A, infer B, infer C] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<B, Prev[Depth]> | SchemaToType<C, Prev[Depth]>
  : Schema extends { anyOf: [infer A, ...infer Rest] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<{ anyOf: Rest }, Prev[Depth]>
  
  : Schema extends { oneOf: [infer A, infer B] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<B, Prev[Depth]>
  : Schema extends { oneOf: [infer A, infer B, infer C] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<B, Prev[Depth]> | SchemaToType<C, Prev[Depth]>
  : Schema extends { oneOf: [infer A, ...infer Rest] }
    ? SchemaToType<A, Prev[Depth]> | SchemaToType<{ oneOf: Rest }, Prev[Depth]>
  
  // Handle enum types
  : Schema extends { enum: readonly [infer A] }
    ? A
  : Schema extends { enum: readonly [infer A, infer B] }
    ? A | B
  : Schema extends { enum: readonly [infer A, infer B, infer C] }
    ? A | B | C
  : Schema extends { enum: readonly any[] }
    ? Schema['enum'][number]
  
  // Handle const values
  : Schema extends { const: infer ConstValue }
    ? ConstValue
  
  // Handle arrays with typed items
  : Schema extends { type: 'array'; items: infer Items }
    ? Array<SchemaToType<Items, Prev[Depth]>>
  
  // Handle objects with properties
  : Schema extends { type: 'object'; properties: infer Props }
    ? ObjectWithProps<Schema, Props, Depth>
  
  // Handle objects without explicit properties (but with additionalProperties)
  : Schema extends { type: 'object'; additionalProperties: infer Additional }
    ? Additional extends false
      ? Record<string, never>
      : Additional extends { type: any }
        ? Record<string, SchemaToType<Additional, Prev[Depth]>>
        : Record<string, any>
  
  // Handle primitive types with format support
  : Schema extends { type: infer Type; format?: infer Format }
    ? Type extends 'string'
      ? Format extends 'date' | 'date-time' | 'time'
        ? string
        : Format extends 'binary' | 'byte'
          ? string | Blob
          : string
      : StringTypeToType<Type>
  
  // Handle pure type without properties
  : Schema extends { type: infer Type }
    ? StringTypeToType<Type>
  
  // Default fallback
  : any;

// Separate type for object property handling to reduce nesting
type ObjectWithProps<Schema, Props, Depth extends number> = 
  {
    [K in keyof Props as K extends RequiredKey<Schema, K> ? K : never]: SchemaToType<Props[K], Prev[Depth]>
  } & {
    [K in keyof Props as K extends RequiredKey<Schema, K> ? never : K]?: SchemaToType<Props[K], Prev[Depth]>
  } & (Schema extends { additionalProperties: infer Additional }
    ? Additional extends false 
      ? {}
      : Additional extends object
        ? { [key: string]: SchemaToType<Additional, Prev[Depth]> }
        : { [key: string]: any }
    : {});

// Helper type to determine required keys
type RequiredKey<Schema, K> = 
  Schema extends { required: readonly any[] }
    ? K extends Schema['required'][number]
      ? K 
      : never
    : never;

// Updated request body converter
export type RequestBodyToRecord<T extends OpenApiRequestBody> = 
  T extends {
    content: {
      'application/json': {
        schema: infer Schema
      }
    }
  } 
    ? SchemaToType<Schema> 
    : T extends {
        content: {
          'application/x-www-form-urlencoded': {
            schema: infer Schema
          }
        }
      }
      ? SchemaToType<Schema>
      : T extends {
          content: {
            'multipart/form-data': {
              schema: infer Schema
            }
          }
        }
        ? SchemaToType<Schema>
        : any;

// Type for OpenAPI request body (you may already have this defined)
export type OpenApiRequestBody = {
  content?: {
    [contentType: string]: {
      schema?: any;
    };
  };
  required?: boolean;
};

// Legacy alias for backward compatibility
export type SchemaToRecord<Schema> = SchemaToType<Schema>;

export const ExampleComplexSchema = {
  type: "object",
  required: ["user", "items", "status"],
  properties: {
    user: {
      type: "object",
      required: ["id", "profile"],
      properties: {
        id: { type: "string" },
        profile: {
          type: "object",
          required: ["name", "email", "roles"],
          properties: {
            name: { type: "string" },
            email: {
              type: "string",
              format: "email"
            },
            roles: {
              type: "array",
              items: {
                type: "string",
                enum: ["admin", "editor", "viewer"]
              },
              minItems: 1
            },
            address: {
              type: "object",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                coordinates: {
                  type: "object",
                  required: ["lat", "lng"],
                  properties: {
                    lat: { type: "number" },
                    lng: { type: "number" }
                  }
                }
              }
            }
          }
        },
        createdAt: {
          type: "string",
          format: "date-time"
        }
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "quantity"],
        properties: {
          type: {
            type: "string",
            enum: ["book", "toy", "tool"]
          },
          quantity: {
            type: "integer",
            minimum: 1
          },
          meta: {
            allOf: [
              {
                type: "object",
                properties: {
                  author: { type: "string" },
                  genre: { type: "string" }
                },
                required: ["author"]
              },
              {
                type: "object",
                properties: {
                  manufacturer: { type: "string" },
                  warranty: { type: "boolean" }
                }
              }
            ]
          }
        }
      }
    },
    status: {
      type: "string",
      enum: ["active", "archived", "pending"]
    },
    tags: {
      type: "array",
      items: {
        type: "string",
      }
    },
    config: {
      type: "object",
      properties: {
        enabled: { type: "boolean", default: true },
        thresholds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              level: { type: "string", enum: ["low", "medium", "high"] },
              value: { type: "number" }
            },
            required: ["level", "value"]
          }
        }
      }
    }
  }
} as const;

export type ExampleComplexSchemaType = SchemaToType<typeof ExampleComplexSchema>;

const x:ExampleComplexSchemaType = {
  items: [
    {
      quantity: 2,
      type: 'book',
      meta: {
        
      }
    }
  ],
  status: 'archived',
  user: {
    id: '123',
    profile: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      roles: ['admin'],
      address: {
        street: '123 Main St',
      }
    }
  },
  tags: []
}