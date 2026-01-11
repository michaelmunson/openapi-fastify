import { ErrorObject } from "ajv";
import { FromSpec, OpenAPI } from ".";
import { OPERATOR_NAMES } from "../utils";
import { Options as AjvOptions } from "ajv";
import { DeepAnyPartial, DeepPartial } from "./utils.types";
import { FastifyReply, FastifyRequest } from "fastify";

type RouterSharedOptions = {
  /**
   * @description Whether to automatically validate the request body and/or response.
   * @example
   * ```typescript
   * {
   *   request: {
   *     validate: true,
   *   },
   *   response: {
   *     validate: true,
   *   }
   * }
   * ```
   */
  autoValidate?: AutoValidateConfig,
  /**
   * @description
   * - The prefix to add to the route(s)
   * @example
   * '/api/v3'
   */
  prefix?: string,
  /**
   * @description
   * - Whether to exclude the route from the OpenAPI specification.
   * @default false
   */
  autoParse?: AutoParseConfig
}


export type RouterOptions = RouteOptions & {
  /**
   * A function that modifies the OpenAPI operation specification.
   * @param spec - The OpenAPI specification.
   * @returns The modified OpenAPI specification.
   */
  specModifier?: (spec: OpenAPI.Operator) => OpenAPI.Operator,
  /**
   * A function that modifies the OpenAPI response specification.
   * @param spec - The OpenAPI response specification.
   * @returns The modified OpenAPI response specification.
   */
  specificationResolver?: (spec: OpenAPI.Document) => OpenAPI.Document
}

export type RouteOptions = RouterSharedOptions & {
  /**
   * @description
   * - Whether to exclude the operator from the OpenAPI specification.
   * @default false
   */
  excludeFromSpecification?: boolean
}

export type OperatorOptions = Omit<RouteOptions, 'prefix'>;

export type RefOptions<T, S extends FromSpec.Refs<T>> = {
  useRef?: boolean
  override?: DeepAnyPartial<FromSpec.ComponentFromRef<T, S>>
}

export type Route = {
  path: string;
  methods: OperatorRecord;
  options?: RouteOptions;
}


export type OperatorName = typeof OPERATOR_NAMES[number];

export type Operator<T extends OpenAPI.Operator> = {
  specification: T,
  handler: FromSpec.Method<T>,
  options?: OperatorOptions
}

export type OperatorRecord = {
  [K in OperatorName]?: Operator<OpenAPI.Operator>
}

export type AutoLoadConfig = {
  include?: string | string[],
  exclude?: string | string[],
}

export type AutoValidateConfig = boolean | ({
  config?: AjvOptions,
  /**
   * @description
   * - Whether to automatically validate the request body.
   * - If true, the request body will be validated against the schema via the preValidation hook.
   * @default 
   * ```typescript
   * {validate: true, errorResponse: {status: 400, payload: {error: "Invalid Request Body", errors: Ajv.Errors[]}}}
   * ````
   */
  request?: AutoValidateRequestResponseConfig,
  /**
   * @description
   * - Whether to automatically validate the response.
   * - If true, the response will be validated against the schema via the preSerialization hook.
   * @default 
   * ```typescript
   * {validate: true, errorResponse: {status: 500, payload: {error: "Invalid Response", errors: Ajv.Errors[]}}}`
   * ```
  */
  response?: AutoValidateRequestResponseConfig
})

export type AutoValidateRequestResponseConfig = boolean | {
  validate?: boolean,
  /**
   * @description
   * - A function that is called when an error occurs during validation.
   * - If not provided, the default error response will be used.
   * @default 
   * ```typescript
   * {status: 400, payload: {error: "Invalid Request Body", errors: Ajv.Errors[]}}
   * ```
   * @example
   * ```typescript
   * (request, reply, errors) => {
   *   return reply.status(400).send({ error: "Invalid Request Body", errors });
   * }
   * ```
   */
  onError?: (request: FastifyRequest, reply:FastifyReply, errors?: ErrorObject<any>[]) => FastifyReply | undefined,
  /**@deprecated use `onError` instead */
  errorResponse?: {
    status: number,
    payload: Record<string, any> | ((errors: ErrorObject<any>[]) => Record<string, any>)
  },
}

export type AutoParseConfig = boolean | Record<'parameters', (
  boolean | {
    parse?: boolean,
    onError?: (request: FastifyRequest, reply: FastifyReply, errors: {
      name: string,
      in: 'query' | 'path' | 'header',
      message:string
    }[]) => FastifyReply | undefined
  }
)>;