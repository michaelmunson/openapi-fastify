import { OpenApiPathOperator } from "./openapi.types";

export type RouterOptions = {
  specModifier?: (spec: OpenApiPathOperator) => OpenApiPathOperator,
}