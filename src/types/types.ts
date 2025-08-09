import { OpenApiParameter, OpenApiPathOperator, OpenApiRequestBody, QueryParametersToRecord } from "./util.types";
import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { ParametersToRecord, RequestBodyToRecord } from "./util.types";
import { OPERATOR_NAMES } from "../utils";

export type OperatorName = typeof OPERATOR_NAMES[number];

export type OperatorMethod<T extends RouteGenericInterface = any> = (request:FastifyRequest<T>, reply: FastifyReply<T>) => any;

export type MethodFromSpec<T extends OpenApiPathOperator> = OperatorMethod<{
  Params: T['parameters'] extends OpenApiParameter[] ? ParametersToRecord<T['parameters']> : never,
  Body: T['requestBody'] extends OpenApiRequestBody ? RequestBodyToRecord<T['requestBody']> : never,
  Querystring: T['parameters'] extends OpenApiParameter[] ? QueryParametersToRecord<T['parameters']> : never,
}>

export type Operator<T extends OpenApiPathOperator> = {
  specification: T,
  handler: MethodFromSpec<T>
}

export type RefStrings<T> = T extends {
  components: {
    schemas: infer Schemas
  }
} ? {
  [K in keyof Schemas]: `#/components/schemas/${string & K}`
}[keyof Schemas] : never;

export type MethodRecord = {
  [K in OperatorName]?: Operator<OpenApiPathOperator>
}