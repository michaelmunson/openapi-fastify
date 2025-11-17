import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OpenAPI, FromSpec, Router } from ".";
import { AutoLoadConfig, RouterOptions } from "./types/router.types";
import { AUTO_VALIDATION_DEFAULTS, debugGroup, debugLog, debugLogEnd, getAutoValidateConfig, getCallerDir, getOperationOptions, getOperationPath, getRequestBodySchema, getResponseSchema, replacePathWithOpenApiParams } from "./utils";
import { globSync } from "glob";
import Ajv from "ajv";
import ajvFormats from "ajv-formats";



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
 *     <const>{
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
  private readonly ajv: Ajv;
  readonly routes: Array<{
    path: string;
    methods: Router.OperatorRecord;
    options?: Router.RouteOptions;
  }> = [];

  constructor(readonly app: FastifyInstance, readonly document: T, readonly options: RouterOptions = {}) {
    const autoValidate = options?.autoValidate;
    const ajvOptions = typeof autoValidate === 'object' ? autoValidate?.config : { allErrors: true };
    this.ajv = new Ajv(ajvOptions);
    ajvFormats(this.ajv)
  }

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
          <const>{
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
  route(path: string, methods: Router.OperatorRecord, options?: Router.RouteOptions) {
    const routerOptions = getOperationOptions({ operatorOptions: undefined, routeOptions: options, routerOptions: this.options });
    const newPath = getOperationPath(path, routerOptions);
    const existingRoute = this.routes.find(r => r.path === newPath);
    if (existingRoute) {
      console.warn(`[WARNING] Route "${newPath}" already exists, merging methods and overriding options`);
      existingRoute.methods = {...existingRoute.methods, ...methods};
      existingRoute.options = options;
      return existingRoute;
    }
    const route = {
      path: newPath,
      methods,
      options
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
      <const>{
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
  op<T extends OpenAPI.Operator>(specification: T, handler: FromSpec.Method<T>, options?: Router.OperatorOptions): Router.Operator<T> {
    return {
      specification,
      handler,
      options
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
   * $.spec(<const>{
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
    let isAutoValidate = this.options.autoValidate
    for (const { path: rawPath, methods, options: routeOptions = {} } of this.routes) {
      for (const [method, { specification: originalSpec, handler, options: operatorOptions = {} }] of Object.entries(methods) as [Router.OperatorName, Router.Operator<OpenAPI.Operator>][]) {
        const operationOptions = getOperationOptions({ operatorOptions, routeOptions, routerOptions: this.options });
        const path = getOperationPath(rawPath, operationOptions);
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        this.app[method](path, {
          schema: specification as any
        }, handler);
        debugLog(`Registered Route: ${method?.toUpperCase()} ${path}`);
      }
    }
    const autoValidate = getAutoValidateConfig(this.options.autoValidate);
    if (autoValidate.request.validate !== false) {
      debugLog('Applying preValidation hook')
      this.app.addHook('preValidation', this.hooks.preValidation);
    }
    if (autoValidate.response.validate !== false) {
      debugLog('Applying preSerialization hook')
      this.app.addHook('preSerialization', this.hooks.preSerialization);
    }
    return this.app;
  }

  /**
   * @description
   * - Autoloads routes from the specified directory.
   * @param include - The files to include.
   * @param exclude - The files to exclude.
   * @returns The Fastify instance.
   * @example
   * ```typescript
   * $.autoload({ include: ['**\/*.ts'], exclude: ['*.exclude.*'] });
   * ```
   */
  async autoload({ include, exclude }: AutoLoadConfig) {
    const toInclude = Array.isArray(include) ? include : include ? [include] : ['**/*.ts'];
    const toExclude = Array.isArray(exclude) ? exclude : exclude ? [exclude] : [];
    const callerDir = getCallerDir();

    // Resolve paths relative to the caller directory
    const files = globSync(toInclude, {
      cwd: callerDir,
      ignore: toExclude,
      absolute: true
    }).filter(file => file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs'));
    const results = await Promise.all(files.map(async file => {
      try {
        return [file, await import(file)]
      } catch (error) {
        debugLog(`Error loading file ${file}:`, error);
        return [null, null]
      }
    })).then(results => results.filter(([file, result]) => file && result));
    debugLog('Loaded files', results.map(([file]) => file));
    this.initialize();
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
    for (const { path: rawPath, methods, options: routeOptions } of this.routes) {
      if (routeOptions?.excludeFromSpecification === true) continue;
      const path = replacePathWithOpenApiParams(rawPath);
      newSpec.paths[path] = newSpec.paths[path] || {};
      for (const [_method, { specification: originalSpec, options: operatorOptions }] of Object.entries(methods)) {
        const options = getOperationOptions({ operatorOptions: operatorOptions, routeOptions, routerOptions: this.options });
        if (options?.excludeFromSpecification === true) continue;
        const method = _method as Router.OperatorName;
        const specification = this.options.specModifier ? this.options.specModifier(originalSpec) : originalSpec;
        newSpec.paths[path][method] = specification;
      }
      if (Object.keys(newSpec.paths[path]).length === 0) delete newSpec.paths[path];
    }
    return newSpec as OpenAPI.Document;
  }

  printRoutes(){
    const toLog = [(this.specification?.info?.title ?? 'API Routes' ) + '\n'];
    for (const { path: rawPath, methods } of this.routes) {
      toLog.push(`  ${rawPath}`);
      for (const [method, { specification }] of Object.entries(methods)) {
        toLog.push(`    ${method?.toUpperCase()} | ${specification?.summary ?? ''}`);
      }
      toLog.push('');
    }
    return toLog.join('\n');
  }

  //////////////////////// PRIVATE METHODS ////////////////////////

  private describeOperation(...args: [request: FastifyRequest] | [method: Router.OperatorName, path: string]) {
    let method: Router.OperatorName;
    let path: string;
    if (args.length === 1) {
      const [request] = args
      method = request.method?.toLowerCase() as Router.OperatorName;
      path = request.routeOptions?.url ?? ''; //replacePathWithOpenApiParams(request.routeOptions?.url ?? '');
    } else {
      method = args[0] as Router.OperatorName;
      path = args[1] as string;
    }
    const route = this.routes.find(r => r.path === path);
    const operation = route?.methods?.[method];
    const options = getOperationOptions({ operatorOptions: operation?.options, routeOptions: route?.options, routerOptions: this.options });
    const autoValidate = getAutoValidateConfig(options?.autoValidate);
    return { method, path, route, operation, options: { ...options, autoValidate } };
  }

  private readonly hooks = {
    // request validation hook
    preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.body;
      const { method, path, operation, options: routeOptions } = this.describeOperation(request);
      try {
        if (method === 'get') return
        debugGroup(`Validating Request Body | ${method} ${path}`);
        if (!path) return debugLogEnd(`Skipping Request Body Validation (No Path)`);
        if (!payload) return debugLogEnd(`Skipping Request Body Validation (No Payload)`);
        if (!operation) return debugLogEnd(`Skipping Request Body Validation (No Operation)`);
        if (routeOptions?.autoValidate?.request?.validate !== true) return debugLogEnd(`Skipping Request Body Validation (Auto Validate Disabled)`);
        const reqBodySpec = getRequestBodySchema(operation.specification);
        if (!reqBodySpec) {
          return debugLogEnd(`Skipping Request Body Validation (No Request Body Schema)`);
        };
        const validate = this.ajv.compile(reqBodySpec)
        const isValid = validate(payload);
        const errors = validate.errors;
        if (!isValid) {
          debugLogEnd(`Request Body Validation Failed`, errors);
          const autoValidate = getAutoValidateConfig(this.options.autoValidate);
          const status = autoValidate?.request?.errorResponse?.status || AUTO_VALIDATION_DEFAULTS.request.errorResponse.status;
          const payload = autoValidate?.request?.errorResponse?.payload || { ...AUTO_VALIDATION_DEFAULTS.request.errorResponse.payload, errors };
          const response = typeof payload === 'function' ? payload(errors || []) : payload;
          return reply.status(status).send(response);
        }
        return debugLogEnd(`Request Body Validation Passed`);
      } catch (error) {
        return debugLogEnd(`Error Validating Request Body`, error);
      }
    },
    // response validation hook
    preSerialization: async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
      debugGroup(`Validating Response Body | ${request.method} ${request.routeOptions?.url}`);
      if (!payload) return debugLogEnd(`Skipping Response Body Validation (No Payload)`);
      const { operation, options: routeOptions } = this.describeOperation(request);
      if (!operation) return debugLogEnd(`Skipping Response Body Validation (No Operation)`);
      const resBodySpec = getResponseSchema(operation?.specification, reply);
      if (!resBodySpec) return debugLogEnd(`Skipping Response Body Validation (No Response Body Schema)`);
      const validate = this.ajv.compile(resBodySpec)
      const isValid = validate(payload);
      const errors = validate.errors;
      if (!isValid) {
        debugLogEnd(`Response Body Validation Failed`, errors);
        const autoValidate = getAutoValidateConfig(this.options.autoValidate);
        const status = autoValidate?.response?.errorResponse?.status || AUTO_VALIDATION_DEFAULTS.response.errorResponse.status;
        const payload = autoValidate?.response?.errorResponse?.payload || { ...AUTO_VALIDATION_DEFAULTS.response.errorResponse.payload, errors };
        const response = typeof payload === 'function' ? payload(errors || []) : payload;
        return reply.status(status).send(response);
      }
      debugLogEnd(`Response Body Validation Passed`);
      return;
    }
  }
}
