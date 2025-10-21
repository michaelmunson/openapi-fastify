import { FromSpec, OpenAPI } from ".";
import { OPERATOR_NAMES } from "../utils";

export type RouterOptions = {
  /**
   * A function that modifies the OpenAPI specification.
   * @param spec - The OpenAPI specification.
   * @returns The modified OpenAPI specification.
   */
  specModifier?: (spec: OpenAPI.Operator) => OpenAPI.Operator,
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

export type OperatorName = typeof OPERATOR_NAMES[number];

export type Operator<T extends OpenAPI.Operator> = {
  specification: T,
  handler: FromSpec.Method<T>
}

export type OperatorRecord = {
  [K in OperatorName]?: Operator<OpenAPI.Operator>
}
