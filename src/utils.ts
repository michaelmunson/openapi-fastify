import { FastifyReply, FastifyRequest } from "fastify";
import { OpenAPI } from "./types";
import Ajv from "ajv";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { AutoValidateConfig, AutoValidateRequestResponseConfig, OperatorOptions, RouteOptions, RouterOptions} from "./types/router.types";

export const OPERATOR_NAMES = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;


export function deepMerge<Base extends object, Value extends Base = Base>(base: Base, value: Value): Base & Value {
  const result = { ...base } as Base;
  for (const key in value) {
      const baseValue = (base as any)[key];
      const updateValue = (value as any)[key];
      if (baseValue && updateValue && typeof baseValue === 'object' && typeof updateValue === 'object') {
          (result as any)[key] = deepMerge(baseValue, updateValue);
      } else if (updateValue !== undefined) {
          (result as any)[key] = updateValue;
      }
  }
  return result as Base & Value;
}

export const parseQueryParams = <T extends OpenAPI.Operator>(specification: T, request: FastifyRequest) => {
  const {parameters} = specification as {parameters:OpenAPI.Parameter[] | undefined};
  const {query} = request as {query:Record<string,string>};
  if (!parameters) return query;
  const queryParamsTypes = Object.fromEntries(
    parameters
      .filter(p => p.in === 'query')
      .map(p => [p.name, (p.schema as OpenAPI.Schema)?.type ?? 'string'])
  );
  const queryParams:Record<string,any> = {};
  for (const [qpName, qpType] of Object.entries(queryParamsTypes)) {
    const value = query[qpName];
    if (value) {
      if (qpType === 'integer') {
        queryParams[qpName] = parseInt(value) as unknown as string;
      } else if (qpType === 'number') {
        queryParams[qpName] = parseFloat(value) as unknown as string;
      } else if (qpType === 'boolean') {
        queryParams[qpName] = value === 'true' ? true : false;
      } else {
        queryParams[qpName] = value;
      }
    }
  }
  return queryParams;
}


export const parseRequestBody = <T extends OpenAPI.Operator>(specification: T, request: FastifyRequest) => {
  const { requestBody } = specification as { requestBody: OpenAPI.RequestBody | undefined };
  if (!requestBody) return request.body;
  const { content } = requestBody;
  if (!content || !content['application/json']) return request.body;
  const { schema } = content['application/json'] as { schema: OpenAPI.Schema };
  if (!schema || typeof request.body !== 'object' || request.body === null) return request.body;

  // Helper to recursively apply defaults
  function applyDefaults(obj: any, schema: any): any {
    if (!schema || typeof schema !== 'object') return obj;
    if (schema.type === 'object' && schema.properties) {
      const result: any = { ...obj };
      for (const [key, propSchema] of Object.entries(schema.properties) as [string, OpenAPI.Schema][]) {
        if (result[key] === undefined) {
          if (propSchema && typeof propSchema === 'object' && 'default' in propSchema) {
            result[key] = propSchema.default;
          } else if (propSchema && propSchema.type === 'object') {
            result[key] = applyDefaults({}, propSchema);
          }
        } else if (propSchema && propSchema.type === 'object') {
          result[key] = applyDefaults(result[key], propSchema);
        } else if (propSchema && propSchema.type === 'array' && Array.isArray(result[key]) && propSchema.items) {
          result[key] = result[key].map((item: any) => applyDefaults(item, propSchema.items));
        }
      }
      return result;
    }
    if (schema.type === 'array' && Array.isArray(obj) && schema.items) {
      return obj.map((item: any) => applyDefaults(item, schema.items));
    }
    return obj;
  }

  return applyDefaults(request.body, schema);
}


export const validateRequestBody = <T extends OpenAPI.Operator>(specification: T, request: FastifyRequest) => {
  const ajv = new Ajv();
  const {requestBody} = specification as {requestBody:OpenAPI.RequestBody | undefined};
  if (!requestBody) return {isValid:true};
  const {content, required} = requestBody;
  if (!content && !required) return {isValid:true};
  if (!content) return {isValid:false};
  const {schema} = content['application/json'] as {schema:OpenAPI.Schema};
  const validate = ajv.compile(schema);
  const isValid = validate(request.body);
  return {
    isValid,
    errors:validate.errors,
  };
}

export const validateResponse = <T extends OpenAPI.Operator>(specification: T, response: FastifyReply, payload:any) => {
  const ajv = new Ajv();
  const {responses} = specification as unknown as {responses:OpenAPI.Response | undefined};
  if (!responses) return {isValid:true};
  const [, responseSchemaContent] = Object.entries(responses).find(([code, responseSchema]) => code === response.status.toString()) ?? [];
  const schema = responseSchemaContent?.content?.['application/json']?.schema as OpenAPI.Schema | undefined;
  if (!schema) return {isValid:true};
  const validate = ajv.compile(schema);
  const isValid = validate(payload);
  return {
    isValid,
    errors:validate.errors,
  };
}

export const isDebugMode = () => ['1', 'true'].includes(process.env.DEBUG_OPENAPI_FASTIFY ?? '');
export const debugGroup = (...args: any[]) => {
  if (isDebugMode()) {
    console.group(...args);
  }
}
export const debugLog = (...args: any[]) => {
  if (isDebugMode()) {
    console.log(...args);
  }
}
export const debugLogEnd = (...args: any[]) => {
  if (isDebugMode()) {
    if (args.length > 0) console.log(...args);
    console.groupEnd();
  }
}

export const replacePathWithOpenApiParams = (path: string) => path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");

export const AUTO_VALIDATION_DEFAULTS = {
  request: {
    validate: false,
    errorResponse: {
      status: 400,
      payload: {error: "Invalid Request Body", errors: []}
    }
  },
  response: {
    validate: false,
    errorResponse: {
      status: 500,
      payload: {error: "Invalid Response", errors: []}
    }
  }
}

export function getCallerDir() {
  const err = new Error();
  const stack = err.stack?.split("\n");
  if (!stack) return process.cwd();
  const callerLine = stack[3];
  const match = callerLine.match(/\((.*):\d+:\d+\)/);
  if (!match) return process.cwd(); // fallback
  const callerFile = match[1];
  return dirname(fileURLToPath(`file://${callerFile}`));
}

export const getAutoValidateConfig = (autoValidate: AutoValidateConfig = false) : {
  request: Exclude<AutoValidateRequestResponseConfig, boolean>,
  response: Exclude<AutoValidateRequestResponseConfig, boolean>,
} => {
  if (autoValidate === true) return {
    request: {validate: true, errorResponse: AUTO_VALIDATION_DEFAULTS.request.errorResponse},
    response: {validate: true, errorResponse: AUTO_VALIDATION_DEFAULTS.response.errorResponse},
  }
  if (typeof autoValidate === 'object') {
    return {
      ...autoValidate,
      request: autoValidate.request === true ? {validate: true, errorResponse: AUTO_VALIDATION_DEFAULTS.request.errorResponse} : autoValidate.request as Exclude<AutoValidateRequestResponseConfig, boolean>,
      response: autoValidate.response === true ? {validate: true, errorResponse: AUTO_VALIDATION_DEFAULTS.response.errorResponse} : autoValidate.response as Exclude<AutoValidateRequestResponseConfig, boolean>,
    }
  }
  return AUTO_VALIDATION_DEFAULTS;
}

export const getOperationPath = (path: string, options?: RouteOptions) => {
  const pathArray = [...options?.prefix?.split('/') ?? '', ...path.split('/')].map(p => p.trim()).filter(Boolean);
  return `/${pathArray.join('/')}`;
}

export const getOperationOptions = ({operatorOptions = {}, routeOptions = {}, routerOptions = {}}:{operatorOptions:OperatorOptions | undefined, routeOptions:RouteOptions | undefined, routerOptions:RouterOptions | undefined}) => {
  const merge1 = deepMerge(routerOptions, routeOptions);
  return deepMerge(merge1, operatorOptions);
}

export const getDefaultOperationOptions = ({operatorOptions = {}, routeOptions = {}, routerOptions = {}}:{operatorOptions:OperatorOptions | undefined, routeOptions:RouteOptions | undefined, routerOptions:RouterOptions | undefined}) : OperatorOptions => {
  const operatorAutoValidate = getAutoValidateConfig(operatorOptions?.autoValidate);
  const routeAutoValidate = getAutoValidateConfig(routeOptions?.autoValidate);
  const routerAutoValidate = getAutoValidateConfig(routerOptions?.autoValidate);
  return {
    autoValidate: {
      request: {
        validate: operatorAutoValidate?.request?.validate ?? routeAutoValidate?.request?.validate ?? routerAutoValidate?.request?.validate ?? false,
        errorResponse: operatorAutoValidate?.request?.errorResponse ?? routeAutoValidate?.request?.errorResponse ?? routerAutoValidate?.request?.errorResponse ?? AUTO_VALIDATION_DEFAULTS.request.errorResponse,
      },
      response: {
        validate: operatorAutoValidate?.response?.validate ?? routeAutoValidate?.response?.validate ?? routerAutoValidate?.response?.validate ?? false,
        errorResponse: operatorAutoValidate?.response?.errorResponse ?? routeAutoValidate?.response?.errorResponse ?? routerAutoValidate?.response?.errorResponse ?? AUTO_VALIDATION_DEFAULTS.response.errorResponse,
      },
    },
  }
}

export const getRequestBodySchema = (specification: OpenAPI.Operator) => {
  const {requestBody} = specification as {requestBody:OpenAPI.RequestBody | undefined};
  if (!requestBody) return undefined;
  const {content} = requestBody;
  if (!content) return undefined;
  const {schema} = content['application/json'] as {schema:OpenAPI.Schema};
  return schema;
}

export const getResponseSchema = (specification: OpenAPI.Operator, response: FastifyReply) => {
  const {responses} = specification as unknown as {responses:OpenAPI.Response | undefined};
  if (!responses) return undefined;
  const responseSchemaContent = responses?.[response.statusCode.toString() as keyof OpenAPI.Response] as {content?: Record<string, {schema:OpenAPI.Schema}>};
  const schema = responseSchemaContent?.content?.['application/json']?.schema as OpenAPI.Schema | undefined;
  return schema;
}