import { OpenApiPathOperator } from "./openapi.types";

export type RouterOptions = {
  /**
   * A function that modifies the OpenAPI specification.
   * @param spec - The OpenAPI specification.
   * @returns The modified OpenAPI specification.
   */
  specModifier?: (spec: OpenApiPathOperator) => OpenApiPathOperator,
  /**
   * @description
   * - Whether to parse query parameters.
   * - If true, the query parameters will be parsed according to that query parameter's schema type.
   * @default false
   */
  parseQueryParams?: boolean,
  /**
   * @description
   * - Whether to enforce the request body schema.
   * - If true, the request body will be validated against the schema.
   * @default false
   */
  enforceRequestBodySchema?: boolean,
  /**
   * @description
   * - Whether to enforce the response schema.
   * - If true, the request will be validated against the schema.
   * @default false
   */
  enforceResponseSchema?: boolean,
  /**
   * @description
   * - Whether to parse the request body.
   * - If true, the request body will be parsed according to that request body's schema type.
   *   - This includes applying defaults to the request body.
   * @default false
   */
  parseRequestBody?: boolean,
}