import {describe, it, expect} from "@jest/globals";
import { getOperationOptions, getOperationPath } from "../../src/utils";

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
  });
});