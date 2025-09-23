import { FastifyInstance } from "fastify";
import { MethodFromSpec, MethodRecord, OpenApiPathOperator, Operator, OperatorName, RefStrings, RefStringToComponentRecord, RefStringToRecord } from "./types";
import { RouterOptions } from "./types/router.types";
import { modifyHandler, replacePathWithOpenApiParams } from "./utils";

/**
 * OpenApiRouter is a class that integrates OpenAPI specifications with Fastify routing.
 * 
 * @template T - The type representing the OpenAPI document.
 * 
 * @property {Array<{ path: string; methods: MethodRecord }>} routes - Stores the registered routes and their method handlers.
 * @property {FastifyInstance} app - The Fastify instance used for registering routes.
 * @property {T} document - The OpenAPI document used for schema references and validation.
 * @property {RouterOptions} options - Optional configuration for the router.
 * 
 * @class
 * 
 * @example
 * ```typescript
 * import Fastify from "fastify";
 * import { OpenApiRouter } from "./router";
 * 
 * const app = Fastify();
 * const openApiDoc = { ... }; // Your OpenAPI document/specification
 * const router = new OpenApiRouter(app, openApiDoc);
 * 
 * router.route("/hello", {
 *   get: router.op(
 *     {
 *       operationId: "getHello",
 *       responses: { 200: { description: "Hello response" } }
 *     },
 *     async (request, reply) => {
 *       reply.send({ message: "Hello, world!" });
 *     }
 *   )
 * });
 * 
 * router.initialize();
 * ```
 */

export class OpenApiRouter<T> {
  readonly routes: Array<{
    path: string;
    methods: MethodRecord;
  }> = [];

  constructor(readonly app: FastifyInstance, readonly document: T, readonly options:RouterOptions={}) {}

  route(path:string, methods:MethodRecord) {
    const route = {
      path,
      methods
    }
    this.routes.push(route);
    return route;
  }

  op<T extends OpenApiPathOperator>(specification: T, handler: MethodFromSpec<T>): Operator<T> {
    return {
      specification,
      handler: modifyHandler(specification, handler, this.options)
    }
  }

  ref<S extends RefStrings<T>>(ref: S, {useRef}: {useRef: boolean} = {useRef: false}): RefStringToComponentRecord<T, S> {
    const [,,schema] = (ref as string).replace('#/', '').split('/');
    const component = (this.document as any).components.schemas[schema];
    if (useRef) {
      return {
        $ref: ref
      } as any
    }
    return {
      ...component
    } as any
  }

  initialize() {
    for (const {path, methods} of this.routes) {
      for (const [_method, {specification:originalSpec, handler}] of Object.entries(methods)) {
        const method = _method as OperatorName;
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        this.app[method](path, {
          schema: specification as any
        }, handler);
      }
    }
    return this.app;
  }

  get specification() {
    const newSpec = {...this.document} as any;
    if (!newSpec.paths) newSpec.paths = {};
    for (const {path:rawPath, methods} of this.routes) {
      const path = replacePathWithOpenApiParams(rawPath);
      newSpec.paths[path] = newSpec.paths[path] || {};
      for (const [_method, {specification:originalSpec, handler}] of Object.entries(methods)) {
        const method = _method as OperatorName;
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        newSpec.paths[path][method] = specification;
      }
    }
    return newSpec;
  }
}
