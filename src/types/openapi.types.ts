import { OpenAPIV3 } from "openapi-types";
import { schemas } from "h2h-sdk";
import { OperatorName } from "./types";

export type {OpenAPIV3}
export type OpenApiDocument = OpenAPIV3.Document;
export type OpenApiGet = OpenAPIV3.HttpMethods;
export type OpenApiPathItem = OpenAPIV3.PathItemObject;
export type OpenApiPathBase = Omit<OpenApiPathItem, OperatorName>;
export type OpenApiPathOperator = OpenAPIV3.OperationObject;
export type OpenApiParameter = OpenAPIV3.ParameterObject;

export type StringTypeToType<T extends string> = T extends 'string' ? string : T extends 'number' ? number : T extends 'boolean' ? boolean : T extends 'integer' ? number : T extends 'array' ? Array<StringTypeToType<T>> : T extends 'object' ? Record<string, any> : never;

export {schemas};