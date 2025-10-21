import {OpenAPI} from ".";
import { OperatorMethod } from "./fastify.types";
import type { 
  MutableRequired,
  ParametersToRecord,
  QueryParametersToRecord,
  RequestBodyToRecord,
  ResponseToRecord,
} from "./utils.types"

export type Params<T extends OpenAPI.Operator> = T['parameters'] extends OpenAPI.Parameter[] ? ParametersToRecord<T['parameters']> : never;
export type QueryParams<T extends OpenAPI.Operator> = T['parameters'] extends OpenAPI.Parameter[] ? QueryParametersToRecord<T['parameters']> : never;
export type RequestBody<T extends OpenAPI.Operator> = T['requestBody'] extends OpenAPI.RequestBody ? RequestBodyToRecord<T['requestBody']> : never;
export type Response<T extends OpenAPI.Operator> = ResponseToRecord<T>
export type All<T extends OpenAPI.Operator> = {
  Params: Params<T>,
  QueryParams: QueryParams<T>,
  RequestBody: RequestBody<T>,
  Response: Response<T>,
}

export type Method<T extends OpenAPI.Operator> = OperatorMethod<{
  Params: Params<T>,
  Body: RequestBody<T>,
  Querystring: QueryParams<T>,
  Response: Response<T>,
}, Response<T>>

export type Refs<T> = T extends { components: infer Components }
  ? {
      [Section in keyof Components]: Section extends string
        ? {
            [K in keyof Components[Section]]: `#/components/${Section}/${string & K}`
          }[keyof Components[Section]]
        : never
    }[keyof Components]
  : never;

export type ComponentFromRef<Document, Ref extends string> =
  Ref extends `#/components/${infer Section}/${infer Name}`
    ? Document extends { components: Record<string, any> }
      ? Section extends keyof Document['components']
        ? Name extends keyof Document['components'][Section]
          ? Document['components'][Section][Name]
          : never
        : never
      : never
    : never;

