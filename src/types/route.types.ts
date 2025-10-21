import {OpenAPI} from ".";
import type { 
  ParametersToRecord,
  QueryParametersToRecord,
  RequestBodyToRecord,
  ResponseToRecord,
} from "./utils.types"
import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";
import { OPERATOR_NAMES } from "../utils";

export type OperatorName = typeof OPERATOR_NAMES[number];
