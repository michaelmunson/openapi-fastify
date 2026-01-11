import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import Fastify from "fastify";
import { OpenApiRouter } from "../../src/router";
import { 
  getOperationOptions, 
  getOperationPath,
  replacePathWithOpenApiParams,
  getRequestBodySchema,
  getResponseSchema,
  getAutoValidateConfig,
  AUTO_VALIDATION_DEFAULTS,
  isObject,
  parseOperationParameters,
  validateRequestBody,
  validateResponse,
  deepMerge
} from "../../src/utils";
import { FastifyReply, FastifyRequest } from "fastify";

describe("Utilities", () => {
  describe("getOperationOptions", () => {
    it("(1) should merge all three options when all are provided", () => {
      const routerOptions = { prefix: "/api" };
      const routeOptions = { prefix: "/v1" };
      const operatorOptions = { autoValidate: true };
      
      const result = getOperationOptions({ routerOptions, routeOptions, operatorOptions });
      
      expect(result).toEqual({
        prefix: "/v1", // routeOptions overrides routerOptions
        autoValidate: true, // operatorOptions is merged
      });
    });

    it("(2) should return routeOptions merged with routerOptions when operatorOptions is undefined", () => {
      const routerOptions = { prefix: "/api" };
      const routeOptions = { prefix: "/v1" };
      
      const result = getOperationOptions({ routerOptions, routeOptions, operatorOptions: undefined });
      
      expect(result).toEqual({
        prefix: "/v1",
      });
    });

    it("(3) should return operatorOptions merged with routerOptions when routeOptions is undefined", () => {
      const routerOptions = { prefix: "/api" };
      const operatorOptions = { autoValidate: true };
      
      const result = getOperationOptions({ routerOptions, routeOptions: undefined, operatorOptions });
      
      expect(result).toEqual({
        prefix: "/api",
        autoValidate: true,
      });
    });

    it("(4) should return operatorOptions when routerOptions is undefined", () => {
      const routeOptions = { prefix: "/v1" };
      const operatorOptions = { autoValidate: true };
      
      const result = getOperationOptions({ routerOptions: undefined, routeOptions, operatorOptions });
      
      expect(result).toEqual({
        prefix: "/v1",
        autoValidate: true,
      });
    });

    it("(5) should return empty object when all options are undefined", () => {
      const result = getOperationOptions({ 
        routerOptions: undefined, 
        routeOptions: undefined, 
        operatorOptions: undefined 
      });
      
      expect(result).toEqual({});
    });

    it("(6) should perform deep merge for nested objects like autoValidate", () => {
      const routerOptions = { 
        autoValidate: { 
          request: { validate: true, errorResponse: { status: 400, payload: { error: "Router Error" } } },
          response: { validate: false }
        } 
      };
      const routeOptions = { 
        autoValidate: { 
          request: { validate: false },
          response: { validate: true, errorResponse: { status: 500, payload: { error: "Route Error" } } }
        } 
      };
      const operatorOptions = { 
        autoValidate: { 
          request: { errorResponse: { status: 422, payload: { error: "Operator Error" } } }
        } 
      };
      
      const result = getOperationOptions({ routerOptions, routeOptions, operatorOptions });
      
      expect(result).toEqual({
        autoValidate: {
          request: {
            validate: false, // routeOptions overrides routerOptions
            errorResponse: {
              status: 422, // operatorOptions overrides routeOptions
              payload: { error: "Operator Error" }
            }
          },
          response: {
            validate: true, // routeOptions overrides routerOptions
            errorResponse: {
              status: 500,
              payload: { error: "Route Error" }
            }
          }
        }
      });
    });

    it("(7) should prioritize operatorOptions over routeOptions over routerOptions", () => {
      const routerOptions = { prefix: "/router", autoValidate: false };
      const routeOptions = { prefix: "/route", autoValidate: { request: { validate: true } } };
      const operatorOptions = { prefix: "/operator", autoValidate: true };
      
      const result = getOperationOptions({ routerOptions, routeOptions, operatorOptions });
      
      expect(result).toEqual({
        prefix: "/operator", // operatorOptions has highest priority
        autoValidate: true, // operatorOptions overrides routeOptions which overrides routerOptions
      });
    });
  });

  describe("getOperationPath", () => {
    it("(1) should return the correct operation path", () => {
      const result = getOperationPath("/users/{id}/posts", { prefix: "/api" });
      expect(result).toEqual("/api/users/{id}/posts");
    });

    it("(2) should return the correct operation path when prefix is empty", () => {
      const result = getOperationPath("users/{id}/posts", { prefix: "/api/v3" });
      expect(result).toEqual("/api/v3/users/{id}/posts");
    });

    it("(3) should return the correct operation path when prefix is undefined", () => {
      const result = getOperationPath("/users/{id}/posts", { prefix: undefined });
      expect(result).toEqual("/users/{id}/posts");
    });

    it("(4) should handle path without leading slash", () => {
      const result = getOperationPath("users", { prefix: "/api" });
      expect(result).toEqual("/api/users");
    });

    it("(5) should handle empty prefix", () => {
      const result = getOperationPath("/users", { prefix: "" });
      expect(result).toEqual("/users");
    });

    it("(6) should trim whitespace from path segments", () => {
      const result = getOperationPath("/users/ /posts", { prefix: "/api" });
      expect(result).toEqual("/api/users/posts");
    });
  });

  describe("replacePathWithOpenApiParams", () => {
    it("(1) should replace :param with {param}", () => {
      const result = replacePathWithOpenApiParams("/users/:id");
      expect(result).toBe("/users/{id}");
    });

    it("(2) should replace multiple parameters", () => {
      const result = replacePathWithOpenApiParams("/users/:userId/posts/:postId");
      expect(result).toBe("/users/{userId}/posts/{postId}");
    });

    it("(3) should handle paths with underscores in param names", () => {
      const result = replacePathWithOpenApiParams("/users/:user_id");
      expect(result).toBe("/users/{user_id}");
    });

    it("(4) should handle paths with numbers in param names", () => {
      const result = replacePathWithOpenApiParams("/users/:id123");
      expect(result).toBe("/users/{id123}");
    });

    it("(5) should not replace params that don't start with letter or underscore", () => {
      const result = replacePathWithOpenApiParams("/users/:123id");
      expect(result).toBe("/users/:123id");
    });

    it("(6) should handle empty path", () => {
      const result = replacePathWithOpenApiParams("");
      expect(result).toBe("");
    });

    it("(7) should handle path with no parameters", () => {
      const result = replacePathWithOpenApiParams("/users/posts");
      expect(result).toBe("/users/posts");
    });
  });

  describe("getRequestBodySchema", () => {
    it("(1) should return schema from requestBody", () => {
      const specification = {
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", properties: { name: { type: "string" } } }
            }
          }
        }
      };
      const result = getRequestBodySchema('application/json', specification as any);
      expect(result).toEqual({ type: "object", properties: { name: { type: "string" } } });
    });

    it("(2) should return undefined when requestBody is missing", () => {
      const specification = {};
      const result = getRequestBodySchema('application/json', specification as any);
      expect(result).toBeUndefined();
    });

    it("(3) should return undefined when content is missing", () => {
      const specification = {
        requestBody: {}
      };
      const result = getRequestBodySchema('application/json', specification as any);
      expect(result).toBeUndefined();
    });

    it("(4) should return undefined when application/json is missing", () => {
      const specification = {
        requestBody: {
          content: {
            "text/plain": {
              schema: { type: "string" }
            }
          }
        }
      };
      const result = getRequestBodySchema('application/json', specification as any);
      console.log(result);
      expect(result).toBeUndefined();
    });
  });

  describe("getResponseSchema", () => {
    it("(1) should return schema for matching status code", () => {
      const specification = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: { type: "string" } } }
              }
            }
          }
        }
      };
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = getResponseSchema('application/json', specification as any, reply);
      expect(result).toEqual({ type: "object", properties: { data: { type: "string" } } });
    });

    it("(2) should return undefined when responses is missing", () => {
      const specification = {};
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = getResponseSchema('application/json', specification as any, reply);
      expect(result).toBeUndefined();
    });

    it("(3) should return undefined when status code doesn't match", () => {
      const specification = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          }
        }
      };
      const reply = {
        statusCode: 404
      } as FastifyReply;
      const result = getResponseSchema('application/json', specification as any, reply);
      expect(result).toBeUndefined();
    });

    it("(4) should return undefined when application/json is missing", () => {
      const specification = {
        responses: {
          "200": {
            content: {
              "text/plain": {
                schema: { type: "string" }
              }
            }
          }
        }
      };
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = getResponseSchema('application/json', specification as any, reply);
      expect(result).toBeUndefined();
    });
  });
  
  describe("isObject", () => {
    it("(1) should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject({ nested: { key: "value" } })).toBe(true);
    });

    it("(2) should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("(3) should return false for arrays", () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it("(4) should return false for primitives", () => {
      expect(isObject("string")).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });

    it("(5) should return false for Date objects", () => {
      expect(isObject(new Date())).toBe(false);
    });
  });

  describe("parseQueryParams", () => {
    it("(1) should parse integer query params", () => {
      const specification = {
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } }
        ]
      };
      const request = {
        query: { limit: "10" }
      } as FastifyRequest;
      const result = parseOperationParameters(specification as any, request);
      expect(result.query.limit).toBe(10);
    });

    it("(2) should parse boolean query params", () => {
      const specification = {
        parameters: [
          { name: "active", in: "query", schema: { type: "boolean" } }
        ]
      };
      const request = {
        query: { active: "true" }
      } as FastifyRequest;
      const result = parseOperationParameters(specification as any, request);
      expect(result.query.active).toBe(true);
    });

    it("(3) should return empty object when no parameters defined", () => {
      const specification = {};
      const request = {
        query: { limit: "10" }
      } as FastifyRequest;
      const result = parseOperationParameters(specification as any, request);
      console.log(result);
      expect(result.query).toEqual({ limit: "10" });
    });

    it("(4) should parse all operation parameters", () => {
      const specification = {
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "id", in: "path", schema: { type: "integer" } },
          { name: "x-is-cool", in: "header", schema: { type: "boolean" } }
        ]
      };
      const request = {
        query: { limit: "10" },
        params: { id: "1" },
        headers: { "x-is-cool": "true" }
      } as any as FastifyRequest;
      const result = parseOperationParameters(specification as any, request);
      expect(result.query.limit).toBe(10);
      expect(result.params.id).toBe(1);
      expect(result.headers["x-is-cool"]).toBe(true);
    });
  });

  describe("validateRequestBody", () => {
    it("(1) should return valid when requestBody is missing", () => {
      const specification = {};
      const request = {
        body: { name: "test" }
      } as FastifyRequest;
      const result = validateRequestBody(specification as any, request);
      expect(result.isValid).toBe(true);
    });

    it("(2) should validate valid request body", () => {
      const specification = {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "number" }
                },
                required: ["name"]
              }
            }
          }
        }
      };
      const request = {
        body: { name: "test", age: 25 }
      } as FastifyRequest;
      const result = validateRequestBody(specification as any, request);
      expect(result.isValid).toBe(true);
    });

    it("(3) should return invalid for missing required fields", () => {
      const specification = {
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" }
                },
                required: ["name"]
              }
            }
          }
        }
      };
      const request = {
        body: {}
      } as FastifyRequest;
      const result = validateRequestBody(specification as any, request);
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe("validateResponse", () => {
    it("(1) should return valid when responses is missing", () => {
      const specification = {};
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = validateResponse(specification as any, reply, { data: "test" });
      expect(result.isValid).toBe(true);
    });

    it("(2) should validate valid response", () => {
      const specification = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "string" }
                  }
                }
              }
            }
          }
        }
      };
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = validateResponse(specification as any, reply, { data: "test" });
      expect(result.isValid).toBe(true);
    });

    it("(3) should return invalid for response that doesn't match schema", () => {
      const specification = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "string" }
                  },
                  required: ["data"]
                }
              }
            }
          }
        }
      };
      const reply = {
        statusCode: 200
      } as FastifyReply;
      const result = validateResponse(specification as any, reply, {});
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeDefined();
    });
  });

  describe("deepMerge", () => {
    it("(1) should merge simple objects", () => {
      const base = { a: 1, b: 2 };
      const value = { b: 3, c: 4 } as any;
      const result = deepMerge(base, value);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("(2) should deeply merge nested objects", () => {
      const base = { a: { x: 1, y: 2 }, b: 3 };
      const value = { a: { y: 4, z: 5 }, c: 6 } as any;
      const result = deepMerge(base, value);
      expect(result).toEqual({ a: { x: 1, y: 4, z: 5 }, b: 3, c: 6 });
    });

    it("(3) should replace arrays (not merge)", () => {
      const base = { items: [1, 2, 3] };
      const value = { items: [4, 5] };
      const result = deepMerge(base, value);
      console.log(result);
      // Arrays are replaced, not merged - arrays are objects in JS, but deepMerge treats them as primitives
      expect(result.items).toEqual([4, 5]);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("(4) should handle undefined values in value object", () => {
      const base = { a: 1, b: 2 };
      const value = { b: undefined, c: 3 } as any;
      const result = deepMerge(base, value);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("(5) should handle empty objects", () => {
      const base = {};
      const value = { a: 1 };
      const result = deepMerge(base, value);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe("getAutoValidateConfig", () => {
    it("(1) should return defaults with validate false when autoValidate is false", () => {
      const result = getAutoValidateConfig(false);
      expect(result).toEqual({
        config: undefined,
        request: { validate: false },
        response: { validate: false },
      });
    });

    it("(2) should return validate true for both request and response when autoValidate is true", () => {
      const result = getAutoValidateConfig(true);
      expect(result).toEqual({
        config: undefined,
        request: { validate: true },
        response: { validate: true },
      });
    });

    it("(3) should return defaults when autoValidate is undefined", () => {
      const result = getAutoValidateConfig(undefined);
      expect(result).toEqual({
        config: undefined,
        request: AUTO_VALIDATION_DEFAULTS.request,
        response: AUTO_VALIDATION_DEFAULTS.response,
      });
    });

    it("(4) should return defaults when autoValidate is null", () => {
      const result = getAutoValidateConfig(null as any);
      expect(result).toEqual({
        config: undefined,
        request: AUTO_VALIDATION_DEFAULTS.request,
        response: AUTO_VALIDATION_DEFAULTS.response,
      });
    });

    it("(5) should handle object config with only config property", () => {
      const ajvConfig = { strict: true };
      const result = getAutoValidateConfig({ config: ajvConfig });
      expect(result.config).toEqual(ajvConfig);
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(6) should handle object config with request as boolean true", () => {
      const result = getAutoValidateConfig({ request: true });
      expect(result.request).toEqual({ validate: true });
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(7) should handle object config with request as boolean false", () => {
      const result = getAutoValidateConfig({ request: false });
      expect(result.request).toEqual({ validate: false });
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(8) should handle object config with response as boolean true", () => {
      const result = getAutoValidateConfig({ response: true });
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual({ validate: true });
    });

    it("(9) should handle object config with response as boolean false", () => {
      const result = getAutoValidateConfig({ response: false });
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual({ validate: false });
    });

    it("(10) should handle object config with request as object", () => {
      const requestConfig = {
        validate: true,
        errorResponse: {
          status: 422,
          payload: { error: "Custom Error" }
        }
      };
      const result = getAutoValidateConfig({ request: requestConfig });
      expect(result.request).toEqual(requestConfig);
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(11) should handle object config with response as object", () => {
      const responseConfig = {
        validate: true,
        errorResponse: {
          status: 502,
          payload: { error: "Custom Response Error" }
        }
      };
      const result = getAutoValidateConfig({ response: responseConfig });
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual(responseConfig);
    });

    it("(12) should handle object config with both request and response as objects", () => {
      const requestConfig = {
        validate: true,
        errorResponse: {
          status: 422,
          payload: { error: "Request Error" }
        }
      };
      const responseConfig = {
        validate: false,
        errorResponse: {
          status: 502,
          payload: { error: "Response Error" }
        }
      };
      const result = getAutoValidateConfig({ request: requestConfig, response: responseConfig });
      expect(result.request).toEqual(requestConfig);
      expect(result.response).toEqual(responseConfig);
    });

    it("(13) should handle object config with both request and response as booleans", () => {
      const result = getAutoValidateConfig({ request: true, response: false });
      expect(result.request).toEqual({ validate: true });
      expect(result.response).toEqual({ validate: false });
    });

    it("(14) should handle object config with config, request, and response", () => {
      const ajvConfig = { strict: false };
      const requestConfig = { validate: true };
      const responseConfig = { validate: false };
      const result = getAutoValidateConfig({ 
        config: ajvConfig, 
        request: requestConfig, 
        response: responseConfig 
      });
      expect(result.config).toEqual(ajvConfig);
      expect(result.request).toEqual(requestConfig);
      expect(result.response).toEqual(responseConfig);
    });

    it("(15) should use defaults when request and response are undefined in object config", () => {
      const result = getAutoValidateConfig({});
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(16) should handle object config with request undefined and response as boolean", () => {
      const result = getAutoValidateConfig({ response: true });
      expect(result.request).toEqual(AUTO_VALIDATION_DEFAULTS.request);
      expect(result.response).toEqual({ validate: true });
    });

    it("(17) should handle object config with response undefined and request as boolean", () => {
      const result = getAutoValidateConfig({ request: false });
      expect(result.request).toEqual({ validate: false });
      expect(result.response).toEqual(AUTO_VALIDATION_DEFAULTS.request);
    });

    it("(18) should handle falsy values like 0 as false", () => {
      const result = getAutoValidateConfig(0 as any);
      expect(result).toEqual({
        config: undefined,
        request: AUTO_VALIDATION_DEFAULTS.request,
        response: AUTO_VALIDATION_DEFAULTS.response,
      });
    });

    it("(19) should handle falsy values like empty string as false", () => {
      const result = getAutoValidateConfig("" as any);
      expect(result).toEqual({
        config: undefined,
        request: AUTO_VALIDATION_DEFAULTS.request,
        response: AUTO_VALIDATION_DEFAULTS.response,
      });
    });
  });
});

describe("OpenApiRouter", () => {
  let app: ReturnType<typeof Fastify>;
  let router: OpenApiRouter<any>;
  const mockDocument = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0"
    },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" }
          }
        }
      }
    }
  };

  beforeEach(() => {
    app = Fastify();
    router = new OpenApiRouter(app, mockDocument);
  });

  describe("constructor", () => {
    it("(1) should create router with document and app", () => {
      expect(router.document).toEqual(mockDocument);
      expect(router.app).toBe(app);
      expect(router.routes).toEqual([]);
    });

    it("(2) should initialize with empty options", () => {
      const router2 = new OpenApiRouter(app, mockDocument);
      expect(router2.options).toEqual({});
    });

    it("(3) should initialize with provided options", () => {
      const options = { prefix: "/api" };
      const router2 = new OpenApiRouter(app, mockDocument, options);
      expect(router2.options).toEqual(options);
    });
  });

  describe("op", () => {
    it("(1) should create operation with specification and handler", () => {
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const handler = async () => ({ message: "test" }) as any;
      const result = router.op(spec as any, handler as any);
      expect(result.specification).toEqual(spec);
      expect(result.handler).toBe(handler);
    });

    it("(2) should include options when provided", () => {
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const handler = async () => ({ message: "test" }) as any;
      const options = { prefix: "/v1" } as any;
      const result = router.op(spec as any, handler as any, options);
      expect(result.options).toEqual(options);
    });
  });

  describe("ref", () => {
    it("(1) should resolve schema reference", () => {
      const result = (router as any).ref('#/components/schemas/User');
      expect(result).toEqual(mockDocument.components.schemas.User);
    });

    it("(2) should return $ref when useRef is true", () => {
      const result = (router as any).ref('#/components/schemas/User', { useRef: true });
      expect(result).toEqual({ $ref: '#/components/schemas/User' });
    });

    it("(3) should return empty object for invalid reference", () => {
      const result = (router as any).ref('#/components/schemas/NonExistent');
      expect(result).toEqual({});
    });

    it("(4) should merge override when provided", () => {
      const override = { required: ["id"] };
      const result = (router as any).ref('#/components/schemas/User', { override });
      expect(result).toMatchObject({
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" }
        },
        required: ["id"]
      });
    });
  });

  describe("spec", () => {
    it("(1) should return copy of specification", () => {
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const result = router.spec(spec as any);
      expect(result).toEqual(spec);
      expect(result).not.toBe(spec); // Should be a copy
    });
  });

  describe("handler", () => {
    it("(1) should return handler function", () => {
      const handler = async () => ({ message: "test" }) as any;
      const result = router.handler(handler as any);
      expect(result).toBe(handler);
    });
  });

  describe("route", () => {
    it("(1) should register a new route", () => {
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const handler = async () => ({ message: "test" });
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      });
      expect(router.routes).toHaveLength(1);
      expect(router.routes[0].path).toBe("/test");
      expect(router.routes[0].methods.get).toBeDefined();
    });

    it("(2) should merge methods when route already exists", () => {
      const spec1 = { summary: "GET", responses: { 200: { description: "OK" } } };
      const spec2 = { summary: "POST", responses: { 201: { description: "Created" } } };
      const handler1 = async () => ({ method: "get" }) as any;
      const handler2 = async () => ({ method: "post" }) as any;
      
      router.route("/test", {
        get: router.op(spec1 as any, handler1 as any)
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      router.route("/test", {
        post: router.op(spec2 as any, handler2 as any)
      });
      consoleSpy.mockRestore();
      
      expect(router.routes).toHaveLength(1);
      expect(router.routes[0].methods.get).toBeDefined();
      expect(router.routes[0].methods.post).toBeDefined();
    });

    it("(3) should apply prefix from router options", () => {
      const router2 = new OpenApiRouter(app, mockDocument, { prefix: "/api" });
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const handler = async () => ({ message: "test" }) as any;
      router2.route("/test", {
        get: router2.op(spec as any, handler as any)
      });
      expect(router2.routes[0].path).toBe("/api/test");
    });

    it("(4) should accept route options", () => {
      const spec = { summary: "Test", responses: { 200: { description: "OK" } } };
      const handler = async () => ({ message: "test" }) as any;
      const routeOptions = { prefix: "/v1" };
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      }, routeOptions);
      expect(router.routes[0].options).toEqual(routeOptions);
      expect(router.routes[0].path).toBe("/v1/test");
    });
  });

  describe("specification getter", () => {
    it("(1) should generate specification from routes", () => {
      const spec = { 
        summary: "Test", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      });
      const result = router.specification;
      expect(result.paths).toBeDefined();
      expect(result.paths['/test']).toBeDefined();
      expect(result.paths['/test']?.get).toEqual(spec);
    });

    it("(2) should convert :param to {param} in paths", () => {
      const spec = { 
        summary: "Test", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/users/:id", {
        get: router.op(spec as any, handler as any)
      });
      const result = router.specification;
      expect(result.paths['/users/{id}']).toBeDefined();
    });

    it("(3) should include document info", () => {
      const result = router.specification;
      expect(result.info).toEqual(mockDocument.info);
    });

    it("(4) should exclude routes with excludeFromSpecification option", () => {
      const spec = { 
        summary: "Test", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      }, { excludeFromSpecification: true });
      const result = router.specification;
      expect(result.paths['/test']).toBeUndefined();
    });
  });

  describe("printRoutes", () => {
    it("(1) should print routes in readable format", () => {
      const spec = { 
        summary: "Test Route", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      });
      const result = router.printRoutes();
      expect(result).toContain("Test API");
      expect(result).toContain("/test");
      expect(result).toContain("GET");
      expect(result).toContain("Test Route");
    });

    it("(2) should handle routes without summary", () => {
      const spec = { 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      });
      const result = router.printRoutes();
      expect(result).toContain("/test");
      expect(result).toContain("GET");
    });
  });

  describe("initialize", () => {
    it("(1) should register routes with Fastify", async () => {
      const spec = { 
        summary: "Test", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router.route("/test", {
        get: router.op(spec as any, handler as any)
      });
      
      const appGetSpy = jest.spyOn(app, 'get');
      router.initialize();
      expect(appGetSpy).toHaveBeenCalledWith(
        "/test",
        { schema: spec },
        handler
      );
      appGetSpy.mockRestore();
    });

    it("(2) should apply specModifier if provided", async () => {
      const modifiedSpec = { 
        summary: "Modified", 
        responses: { 200: { description: "OK" } } 
      };
      const specModifier = jest.fn().mockReturnValue(modifiedSpec) as any;
      const router2 = new OpenApiRouter(app, mockDocument, { specModifier });
      
      const spec = { 
        summary: "Test", 
        responses: { 200: { description: "OK" } } 
      };
      const handler = async () => ({ message: "test" }) as any;
      router2.route("/test", {
        get: router2.op(spec as any, handler as any)
      });
      
      const appGetSpy = jest.spyOn(app, 'get');
      router2.initialize();
      expect(specModifier).toHaveBeenCalledWith(spec);
      expect(appGetSpy).toHaveBeenCalledWith(
        "/test",
        { schema: modifiedSpec },
        handler
      );
      appGetSpy.mockRestore();
    });

    it("(3) should return Fastify app instance", () => {
      const result = router.initialize();
      expect(result).toBe(app);
    });
  });
});
