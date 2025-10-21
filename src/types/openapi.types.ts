import { OpenAPIV3 } from "./lib/openapi-types";
import { OperatorName } from "./router.types";

export type {OpenAPIV3}
export type Document = OpenAPIV3.Document;
export type Get = OpenAPIV3.HttpMethods;
export type Item = OpenAPIV3.PathItemObject;
export type PathBase = Omit<Item, OperatorName>;
export type Operator = OpenAPIV3.OperationObject;
export type Parameter = OpenAPIV3.ParameterObject;
export type RequestBody = OpenAPIV3.RequestBodyObject;
export type Components = OpenAPIV3.ComponentsObject;
export type Schema = OpenAPIV3.SchemaObject;
export type Response = OpenAPIV3.ResponseObject;

const x:Operator = {
  responses: {
    200: {
      description: "User object",
      content: {
        "application/json": {
          schema: { type: "object", properties: { id: { type: "integer" }, username: { type: "string" }, email: { type: "string" }, role: { type: "string" } }, 
          required: ["id", "username", "email", "role"] as readonly string[] }
        }
      }
    }
  }
}