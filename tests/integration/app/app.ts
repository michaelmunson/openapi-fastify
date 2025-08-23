import Fastify from "fastify";
import { OpenApiRouter } from "../../../src/router";
import specification from "./specification";

const app = Fastify();

export const $ = new OpenApiRouter(app, specification, {
  parseQueryParams: true,
  enforceRequestBodySchema: true,
  parseRequestBody: true,
});

export default app;