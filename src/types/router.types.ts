import {ErrorObject} from "ajv";
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
   * - Whether to automatically validate the request body and response.
   */
  autoValidate?: {
    /**
     * @description
     * - Whether to automatically validate the request body.
     * - If true, the request body will be validated against the schema via the preValidation hook.
     * @default `{validate: true, errorResponse: {status: 400, payload: {error: "Invalid Request Body", errors: Ajv.Errors[]}}}`
     */
    request?: {
      validate?: boolean,
      errorResponse?: {
        status: number,
        payload: Record<string,any> | ((errors:ErrorObject<any>[]) => Record<string,any>)
      }
    },
    /**
     * @description
     * - Whether to automatically validate the response.
     * - If true, the response will be validated against the schema via the preSerialization hook.
     * @default `{validate: true, errorResponse: {status: 500, payload: {error: "Invalid Response", errors: Ajv.Errors[]}}}`
     */
    response?: {
      validate?: boolean,
      errorResponse?: {
        status: number,
        payload: Record<string,any> | ((errors:ErrorObject<any>[]) => Record<string,any>)
      }
    }
  }
}

export type OperatorName = typeof OPERATOR_NAMES[number];

export type Operator<T extends OpenAPI.Operator> = {
  specification: T,
  handler: FromSpec.Method<T>
}

export type OperatorRecord = {
  [K in OperatorName]?: Operator<OpenAPI.Operator>
}
