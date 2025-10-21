import { OpenAPIV3 } from "openapi-types";
import { OperatorName } from "./types";

export type {OpenAPIV3}
export type OpenApiDocument = OpenAPIV3.Document;
export type OpenApiGet = OpenAPIV3.HttpMethods;
export type OpenApiPathItem = OpenAPIV3.PathItemObject;
export type OpenApiPathBase = Omit<OpenApiPathItem, OperatorName>;
export type OpenApiPathOperator = OpenAPIV3.OperationObject;
export type OpenApiParameter = OpenAPIV3.ParameterObject;