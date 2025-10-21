import Fastify from "fastify";
import { OpenApiRouter } from "../../../src/router";
import specification from "./specification";

const app = Fastify();

export const $ = new OpenApiRouter(app, specification, {
  autoValidate: {
    request: {
      validate: false,
    },
    response: {
      validate: true
    }
  }
});

export default app;