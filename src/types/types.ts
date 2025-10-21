import {OpenAPI, Route} from ".";
import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { OPERATOR_NAMES } from "../utils";

export type OperatorName = typeof OPERATOR_NAMES[number];

export type OperatorMethod<T extends RouteGenericInterface = any> = (request:FastifyRequest<T>, reply: FastifyReply<T>) => any;

export type MethodFromSpec<T extends OpenAPI.Operator> = OperatorMethod<{
  Params: Route.Params<T>,
  Body: Route.RequestBody<T>,
  Querystring: Route.QueryParams<T>,
  Response: Route.Response<T>,
}>

export type Operator<T extends OpenAPI.Operator> = {
  specification: T,
  handler: MethodFromSpec<T>
}

export type RefStrings<T> = T extends { components: infer Components }
  ? {
      [Section in keyof Components]: Section extends string
        ? {
            [K in keyof Components[Section]]: `#/components/${Section}/${string & K}`
          }[keyof Components[Section]]
        : Section extends number ? {
          [K in keyof Components[Section]]: `#/components/${Section}/${string & K}`
        }[keyof Components[Section]] : never
    }[keyof Components]
  : never;


export type MethodRecord = {
  [K in OperatorName]?: Operator<OpenAPI.Operator>
}
