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
  (T extends 'string' ? string 
    : T extends 'number' ? number 
    : T extends 'integer' ? number
    : T extends 'boolean' ? boolean 
    : T extends 'array' ? any[]
    : T extends 'object' ? Record<string, any>
    : any)

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

export type RequestBodyToRecord<T extends OpenApiRequestBody> = T extends {
  content: {
    'application/json': {
      schema: infer Schema
    }
  }
} ? SchemaToRecord<Schema> : any

export type SchemaToRecord<Schema> = Schema extends {
  type: 'object',
  properties: infer Properties
} ? {
  [K in keyof Properties]: Properties[K] extends { type: infer Type }
    ? StringTypeToType<Type>
    : any
} : any;

export type RefStringToRecord<Document, Ref> = 
  Ref extends `#/components/schemas/${infer SchemaName}`
    ? Document extends { components: { schemas: infer Schemas } }
      ? SchemaName extends keyof Schemas
        ? Schemas[SchemaName]
        : never
      : never
    : never;

  /**
   * Given an OpenAPI Document and a reference string, resolves the referenced object
   * from any section of the OpenAPI components object (schemas, responses, parameters, etc).
   * 
   * Example:
   *   RefStringToComponentRecord<MyDoc, "#/components/schemas/User">
   *   RefStringToComponentRecord<MyDoc, "#/components/responses/NotFound">
   */
  export type RefStringToComponentRecord<Document, Ref extends string> =
    Ref extends `#/components/${infer Section}/${infer Name}`
      ? Document extends { components: Record<string, any> }
        ? Section extends keyof Document['components']
          ? Name extends keyof Document['components'][Section]
            ? Document['components'][Section][Name]
            : never
          : never
        : never
      : never;
