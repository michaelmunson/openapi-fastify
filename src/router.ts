import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OpenAPI, FromSpec, Router } from ".";
import { RouterOptions } from "./types/router.types";
import { AUTO_VALIDATION_DEFAULTS, debugLog, replacePathWithOpenApiParams, validateRequestBody, validateResponse } from "./utils";
import Ajv from "ajv";

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
    methods: Router.OperatorRecord;
  }> = [];

  constructor(readonly app: FastifyInstance, readonly document: T, readonly options: RouterOptions = {}) { }

  /**
   * @description
   * Registers a new route with the specified path and HTTP methods.
   * @param path - The path of the route.
   * @param methods - The HTTP methods of the route.
   * @returns The route object.
   * @example
   * ```typescript
   * $.route("/users", {
        post: $.op(
          {
            summary: "Create a new user",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: $.ref('#/components/schemas/User')
                }
              }
            },
            responses: {
              201: $.ref('#/components/responses/UserCreated')
            }
          },
          async (request, reply) => {
            const { username, email, password, role } = request.body as any;
            const user = dbHelpers.addUser({ username, email, password, role });
            const { password: _, ...rest } = user;
            reply.code(201);
            return rest;
          }
        )
      });
  * ```
   */
  route(path: string, methods: Router.OperatorRecord) {
    const route = {
      path,
      methods
    }
    this.routes.push(route);
    return route;
  }

  /**
   * @description
   * Creates an operation handler with OpenAPI specification and type-safe handler function.
   * @param specification - The OpenAPI specification.
   * @param handler - The handler function.
   * @returns The operator object.
   * @example
  * ```typescript
    $.op(
      {
        summary: "Create a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: $.ref('#/components/schemas/User')
            }
          }
        },
        responses: {
          201: $.ref('#/components/responses/UserCreated')
        }
      },
      async (request, reply) => {
        const { username, email, password, role } = request.body as any;
        const user = dbHelpers.addUser({ username, email, password, role });
        const { password: _, ...rest } = user;
        reply.code(201);
        return rest;
      }
    )
   * ```
   */
  op<T extends OpenAPI.Operator>(specification: T, handler: FromSpec.Method<T>): Router.Operator<T> {
    return {
      specification,
      handler
    }
  }

  /**
   * @description
   * Creates a reference to a schema in the OpenAPI document.
   * @param ref - The reference string.
   * @param options - The options for the reference.
   * @returns The referenced schema object.
   * @example
  * ```typescript
   * $.ref('#/components/schemas/User') // returns `{type: 'object', properties: {...}}`
   * ```
   * @example `with useRef: true`
   * ```typescript
   * $.ref('#/components/schemas/User', {useRef: true}) // returns `{$ref: '#/components/schemas/User'}`
   * ```
   */
  ref<S extends FromSpec.Refs<T>>(ref: S, { useRef }: { useRef?: boolean } = { useRef: false }): FromSpec.ComponentFromRef<T, S> {
    const [, , schema] = (ref as string).replace('#/', '').split('/');
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

  /**
   * @description
   * - Helper function to create a new OpenAPI path operator specification.
   * - Useful when you want to define a specification outside of the route registration.
   * @param specification - The OpenAPI specification.
   * @returns The new OpenAPI specification.
   * @example
   * ```typescript
   * $.spec({
   *   summary: "Create a new user",
   *   requestBody: {
   *     required: true,
   *     content: {
   *       "application/json": {
   *         schema: $.ref('#/components/schemas/User')
   *       }
   *     }
   *   }
   * })
   * ```
   */
  spec<T extends OpenAPI.Operator>(specification: T) {
    return { ...specification } as const;
  }

  /**
   * @description
   * - Creates a handler function with the specified OpenAPI specification.
   * @param handler - The handler function.
   * @returns The handler function.
   * @example
   * ```typescript
   * const spec = $.spec(<const>{
   *   summary: "Create a new user",
   *   requestBody: {
   *     required: true,
   *     content: {
   *       "application/json": {
   *         schema: $.ref('#/components/schemas/User')
   *       }
   *     }
   *   },
   *   responses: {
   *     200: {
   *       description: "User created",
   *       content: {
   *         "application/json": {
   *           schema: $.ref('#/components/schemas/User')
   *         }
   *       }
   *     }
   *   }
   * })
   * $.handler<typeof spec>(async (request) => {
   *   return {id: 1, username: "alice", email: "alice@example.com", role: "user"};
   * })
   * ```
   */
  handler<T extends OpenAPI.Operator>(handler: FromSpec.Method<T>) {
    return handler;
  }

  /**
   * @description
   * - Initializes the router and registers all routes with Fastify.
   * @returns The Fastify instance.
   * @example
   * ```typescript
   * $.initialize();
   * ```
   */
  initialize() {
    for (const { path, methods } of this.routes) {
      for (const [_method, { specification: originalSpec, handler }] of Object.entries(methods) as [Router.OperatorName, Router.Operator<OpenAPI.Operator>][]) {
        const method = _method;
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        this.app[method](path, {
          schema: specification as any
        }, handler);
      }
    }
    if (this.options.autoValidate) {
      const { request, response } = this.options.autoValidate;
      if (request && request.validate) {
        debugLog('Applying preValidation hook')
        this.app.addHook('preValidation', this.hooks.preValidation);
      }
      if (response && response.validate) {
        debugLog('Applying preSerialization hook')
        this.app.addHook('preSerialization', this.hooks.preSerialization);
      }
    }
    return this.app;
  }

  /**
   * @description
   * - Returns the OpenAPI specification.
   * - This method should be called after all routes have been registered.
   * @returns The OpenAPI specification.
   * @example
   * ```typescript
   * const spec = $.specification;
   * console.log(spec.paths['/users']);
   * ```
   */
  get specification() {
    const newSpec = { ...this.document } as any;
    if (!newSpec.paths) newSpec.paths = {};
    for (const { path: rawPath, methods } of this.routes) {
      const path = replacePathWithOpenApiParams(rawPath);
      newSpec.paths[path] = newSpec.paths[path] || {};
      for (const [_method, { specification: originalSpec }] of Object.entries(methods)) {
        const method = _method as Router.OperatorName;
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        newSpec.paths[path][method] = specification;
      }
    }
    return newSpec as OpenAPI.Document;
  }

  //////////////////////// PRIVATE METHODS ////////////////////////

  private readonly hooks = {
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.body;
      const method = request.method.toLowerCase();
      const route = replacePathWithOpenApiParams(request.routeOptions.url ?? '');
      debugLog('preValidation', method, route);
      if (method === "get" || !route || !payload) return;
      const paths = this.specification.paths
      const reqBodyContent = (paths as any)?.[route]?.[method]?.['requestBody']?.['content'];
      const reqBodySpec = (Object.values(reqBodyContent)[0] as { schema?: any })?.schema;
      debugLog('Request Body Spec', reqBodySpec);
      debugLog('Payload', payload)
      if (!reqBodySpec) return;
      const validate = new Ajv().compile(reqBodySpec)
      const isValid = validate(payload);
      const errors = validate.errors;
      debugLog('Validation Result', isValid, errors);
      if (!isValid) {
        const status = this.options?.autoValidate?.request?.errorResponse?.status || AUTO_VALIDATION_DEFAULTS.request.errorResponse.status;
        const payload = this.options?.autoValidate?.request?.errorResponse?.payload || { ...AUTO_VALIDATION_DEFAULTS.request.errorResponse.payload, errors };
        reply.status(status).send(typeof payload === 'function' ? payload(errors || []) : payload);
        // return typeof payload === 'function' ? payload(errors || []) : payload;
      }
    },
    preSerialization: async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      const method = request.method.toLowerCase();
      const route = replacePathWithOpenApiParams(request.routeOptions.url ?? '');
      if (!payload) return
      console.log('Route', route);
      const status = reply.statusCode;
      console.log('Status', status)
      const paths = this.specification.paths;
      console.log('Paths', Object.keys(paths), (paths as any)[route][method])
      const resBodyContent = (paths as any)?.[route]?.[method]?.['responses']?.[status.toString()]?.['content'] ?? {};
      const resBodySpec = (Object.values(resBodyContent)[0] as { schema?: any })?.schema;
      debugLog('Response Body Spec', JSON.stringify(resBodySpec));
      debugLog('Payload', payload)
      if (!resBodySpec) return;
      const validate = new Ajv().compile(resBodySpec)
      const isValid = validate(payload);
      const errors = validate.errors;
      // const { isValid, errors } = validateResponse(resBodySpec, reply, payload);
      debugLog('Validation Result', isValid, errors);
      if (!isValid) {
        const status = this.options?.autoValidate?.response?.errorResponse?.status || AUTO_VALIDATION_DEFAULTS.response.errorResponse.status;
        const payload = this.options?.autoValidate?.response?.errorResponse?.payload || { ...AUTO_VALIDATION_DEFAULTS.response.errorResponse.payload, errors };
        reply.status(status);
        return typeof payload === 'function' ? payload(errors || []) : payload;
      }
      return;
    }
  }
}
