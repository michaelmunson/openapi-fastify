import { FastifyInstance } from "fastify";
import { MethodFromSpec, MethodRecord, OpenApiPathOperator, Operator, OperatorName, RefStrings, RefStringToRecord } from "./types";
import { RouterOptions } from "./types/router.types";

export class OpenApiRouter<T> {
  routes: Array<{
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
      handler
    }
  }

  ref<S extends RefStrings<T>>(ref: S): RefStringToRecord<T, S> {
    const [,,schema] = (ref as string).replace('#/', '').split('/');
    const component = (this.document as any).components.schemas[schema];
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
}
