import * as OpenAPI from "./openapi.types";


export type StringTypeToType<T> =
  T extends 'string' ? string
  : T extends 'number' ? number
  : T extends 'integer' ? number
  : T extends 'boolean' ? boolean
  : T extends 'null' ? null
  : T extends 'array' ? any[]
  : T extends 'object' ? Record<string, any>
  : any;

export type ParametersToRecord<T extends OpenAPI.Parameter[]> = {
  [K in T[number]as K extends { in: 'path' } ? K['name'] : never]: K extends { schema: { type: infer Type } }
  ? StringTypeToType<Type>
  : string
}

export type QueryParametersToRecord<T extends OpenAPI.Parameter[]> = {
  [K in T[number]as K extends { in: 'query' } ? K['name'] : never]: K extends { schema: { type: infer Type } }
  ? StringTypeToType<Type>
  : any
}

export type SchemaToType<Schema> =
  Schema extends { $ref: string }
  ? any
  : Schema extends { oneOf: infer OneOf extends any[] }
  ? SchemaToOneOf<OneOf>

  : Schema extends { anyOf: infer AnyOf extends any[] }
  ? SchemaToAnyOf<AnyOf>

  : Schema extends { allOf: infer AllOf extends any[] }
  ? SchemaToAllOf<AllOf>

  : Schema extends { enum: infer EnumValues extends readonly any[] }
  ? EnumValues[number]

  : Schema extends { const: infer ConstValue }
  ? ConstValue

  : Schema extends { type: 'array'; items: infer Items }
  ? Array<SchemaToType<Items>>

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

export type BodyToRecord<T extends OpenAPI.RequestBody> =
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

export type RequestBodyToRecord<T extends OpenAPI.RequestBody> = BodyToRecord<T>;


export type ResponseToRecord<T> =
  T extends { responses: infer Responses }
  ? {
    [K in keyof Responses]:
    Responses[K] extends {
      content: {
        'application/json': {
          schema: infer Schema
        }
      }
    }
    ? SchemaToType<Schema>
    : never
  }[keyof Responses]
  : never;


export type SchemaToRecord<Schema> = SchemaToType<Schema>;


export type MutableRequired<T> = T extends object
  ? T extends { required?: readonly string[] }
  ? Omit<T, 'required'> & { required?: string[] }
  : T
  : T;

export type ReadonlyRequired<T> = T extends object
  ? T extends { required?: string[] }
  ? Omit<T, 'required'> & { readonly required?: readonly string[] }
  : T
  : T;