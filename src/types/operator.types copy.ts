import { OpenAPIV3 } from "openapi-types";
import { OperatorName } from "./types";

export type {OpenAPIV3}
export type OpenApiDocument = OpenAPIV3.Document;
export type OpenApiGet = OpenAPIV3.HttpMethods;
export type OpenApiPathItem = OpenAPIV3.PathItemObject;
export type OpenApiPathBase = Omit<OpenApiPathItem, OperatorName>;
export type OpenApiPathOperator = OpenAPIV3.OperationObject;
export type OpenApiParameter = OpenAPIV3.ParameterObject;
export type OpenApiRequestBody = OpenAPIV3.RequestBodyObject;
export type OpenApiComponents = OpenAPIV3.ComponentsObject;
export type OpenApiSchema = OpenAPIV3.SchemaObject;

export type StringTypeToType<T> =
  T extends 'string' ? string
  : T extends 'number' ? number
  : T extends 'integer' ? number
  : T extends 'boolean' ? boolean
  : T extends 'null' ? null
  : T extends 'array' ? any[]
  : T extends 'object' ? Record<string, any>
  : any;

export type ParametersToRecord<T extends OpenApiParameter[]> = {
  [K in T[number] as K extends { in: 'path' } ? K['name'] : never]: K extends { schema: { type: infer Type } } 
    ? StringTypeToType<Type>
    : string  
}

export type QueryParametersToRecord<T extends OpenApiParameter[]> = {
  [K in T[number] as K extends { in: 'query' } ? K['name'] : never]: K extends { schema: { type: infer Type } } 
    ? StringTypeToType<Type>
    : any
}

export type SchemaToType<Schema> =
  Schema extends { $ref: string }
  ? any

  // --- Handle Combinators ---
  : Schema extends { oneOf: infer OneOf extends any[] }
  ? SchemaToOneOf<OneOf>

  : Schema extends { anyOf: infer AnyOf extends any[] }
  ? SchemaToAnyOf<AnyOf>

  : Schema extends { allOf: infer AllOf extends any[] }
  ? SchemaToAllOf<AllOf>

  // --- Enums and Consts ---
  : Schema extends { enum: infer EnumValues extends readonly any[] }
  ? EnumValues[number]

  : Schema extends { const: infer ConstValue }
  ? ConstValue

  // --- Arrays ---
  : Schema extends { type: 'array'; items: infer Items }
  ? Array<SchemaToType<Items>>

  // --- Objects ---
  : Schema extends { type: 'object'; properties: infer Props }
  ? {
      [K in keyof Props as K extends RequiredKey<Schema, K> ? K : never]: SchemaToType<Props[K]>
    } & {
      [K in keyof Props as K extends RequiredKey<Schema, K> ? never : K]?: SchemaToType<Props[K]>
    } & (Schema extends { additionalProperties: infer Additional }
      ? Additional extends false
        ? {}
        : Additional extends { type: any }
        ? { [key: string]: SchemaToType<Additional> }
        : { [key: string]: any }
      : {})

  : Schema extends { type: 'object'; additionalProperties: infer Additional }
  ? Additional extends false
    ? Record<string, never>
    : Additional extends { type: any }
    ? Record<string, SchemaToType<Additional>>
    : Record<string, any>

  // --- Primitives ---
  : Schema extends { type: infer Type; format?: infer Format }
  ? Type extends 'string'
    ? Format extends 'date' | 'date-time' | 'time'
      ? string
      : Format extends 'binary' | 'byte'
      ? string | Blob
      : string
    : StringTypeToType<Type>

  : Schema extends { type: infer Type }
  ? StringTypeToType<Type>

  : any;

  type SchemaToOneOf<T extends any[]> = T[number] extends infer Each
  ? SchemaToType<Each>
  : never;

type SchemaToAnyOf<T extends any[]> = T[number] extends infer Each
  ? SchemaToType<Each>
  : never;

type SchemaToAllOf<T extends any[]> =
  UnionToIntersection<SchemaToType<T[number]>>;


type RequiredKey<Schema, K> =
  Schema extends { required: infer Req extends readonly any[] }
  ? K extends Req[number]
  ? K
  : never
  : never;

type UnionToIntersection<U> =
  (U extends any ? (x: U) => void : never) extends (x: infer I) => void
  ? I
  : never;

export type BodyToRecord<T extends OpenApiRequestBody> =
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


export type SchemaToRecord<Schema> = SchemaToType<Schema>;

/* // Example of a fairly complex JSON Schema type
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
        type: "string"
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
      type: 'book',
      quantity: 2,
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
        city: 'New York',
        coordinates: {
          lat: 40.7128,
          lng: -74.0060
        }
      }
    }
  },
  tags: []
} */