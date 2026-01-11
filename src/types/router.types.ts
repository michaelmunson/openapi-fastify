import { ErrorObject } from "ajv";
import { FromSpec, OpenAPI } from ".";
import { OPERATOR_NAMES } from "../utils";
import { Options as AjvOptions } from "ajv";
import { DeepAnyPartial, DeepPartial } from "./utils.types";

export type RouterOptions = RouteOptions & {
  /**
   * A function that modifies the OpenAPI specification.
   * @param spec - The OpenAPI specification.
   * @returns The modified OpenAPI specification.
   */
  specModifier?: (spec: OpenAPI.Operator) => OpenAPI.Operator
}

export type Route = {
  path: string;
  methods: OperatorRecord;
  options?: RouteOptions;
}

export type RouteOptions = OperatorOptions & {
  /**
   * @description
   * - The prefix to add to the route(s).
   */
  prefix?: string
}

export type OperatorName = typeof OPERATOR_NAMES[number];

export type Operator<T extends OpenAPI.Operator> = {
  specification: T,
  handler: FromSpec.Method<T>,
  options?: OperatorOptions
}

export type OperatorOptions = {
  /**
   * @description
   * - Whether to automatically validate the request body and/or response.
   */
  autoValidate?: AutoValidateConfig,
  /**
   * @description
   * - Whether to exclude the operator from the OpenAPI specification.
   * @default false
   */
  excludeFromSpecification?: boolean
}

export type OperatorRecord = {
  [K in OperatorName]?: Operator<OpenAPI.Operator>
}

export type AutoLoadConfig = {
  include?: string | string[],
  exclude?: string | string[],
}

export type AutoValidateConfig = boolean | {
  config?: AjvOptions,
  /**
   * @description
   * - Whether to automatically validate the request body.
   * - If true, the request body will be validated against the schema via the preValidation hook.
   * @default `{validate: true, errorResponse: {status: 400, payload: {error: "Invalid Request Body", errors: Ajv.Errors[]}}}`
   */
  request?: AutoValidateRequestResponseConfig,
  /**
   * @description
   * - Whether to automatically validate the response.
   * - If true, the response will be validated against the schema via the preSerialization hook.
   * @default `{validate: true, errorResponse: {status: 500, payload: {error: "Invalid Response", errors: Ajv.Errors[]}}}`
   */
  response?: AutoValidateRequestResponseConfig,
}

export type AutoValidateRequestResponseConfig = boolean | {
  validate?: boolean,
  errorResponse?: {
    status: number,
    payload: Record<string, any> | ((errors: ErrorObject<any>[]) => Record<string, any>)
  },
}

export type RefOptions<T, S extends FromSpec.Refs<T>> = {
  useRef?: boolean
  override?: DeepAnyPartial<FromSpec.ComponentFromRef<T, S>>
}