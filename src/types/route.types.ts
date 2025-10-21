import {OpenAPI} from ".";
import type { 
  ParametersToRecord,
  QueryParametersToRecord,
  RequestBodyToRecord,
  ResponseToRecord,
} from "./operator.types"

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