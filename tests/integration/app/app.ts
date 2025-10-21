import Fastify from "fastify";
import { OpenApiRouter } from "../../../src/router";
import specification from "./specification";

const app = Fastify();

// app.addHook('preValidation', async (req, reply) => {
//   console.log(req.routeOptions.url);
//   return;
// })

export const $ = new OpenApiRouter(app, specification, {
  autoValidate: {
    request: {
      validate: true,
    },
    response: {
      validate: true
    }
  },
});

export default app;