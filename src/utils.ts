import { FastifyReply, FastifyRequest } from "fastify";
import { OpenAPI } from "./types";
import Ajv, { Options as AjvOptions, ErrorObject } from "ajv";
import ajvFormats from "ajv-formats";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { AutoParseConfig, AutoValidateConfig, AutoValidateRequestResponseConfig, OperatorOptions, RouteOptions, RouterOptions } from "./types/router.types";

export const OPERATOR_NAMES = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

export const createAjv = (config?: AjvOptions) => {
  const ajv = new Ajv(config);
  ajvFormats(ajv);
  return ajv;
}

export function deepMerge<Base extends object, Value extends Base = Base>(base: Base, value: Value): Base & Value {
  const result = Array.isArray(base) ? [...base] : { ...base } as Base;
  for (const key in value) {
    const baseValue = (base as any)[key];
    const updateValue = (value as any)[key];
    if (baseValue && updateValue && typeof baseValue === 'object' && typeof updateValue === 'object') {
      if (Array.isArray(updateValue)) {
        (result as any)[key] = updateValue;
      } else {
        (result as any)[key] = deepMerge(baseValue, updateValue);
      }
    } else if (updateValue !== undefined) {
      (result as any)[key] = updateValue;
    }
  }
  return result as Base & Value;
}

export const getAutoParseConfig = (autoParse: AutoParseConfig = false) => {
  if (!autoParse) autoParse = false;
  if (typeof autoParse === 'boolean') return { parameters: { parse: autoParse } };
  else if (typeof autoParse === 'object' && typeof autoParse !== null) {
    return {
      ...autoParse,
      parameters: { parse: typeof autoParse.parameters === 'boolean' ? autoParse.parameters : autoParse.parameters?.parse ?? false }
    };
  }
  return { parameters: { parse: false } };
}

export const parseOperationParameters = <T extends OpenAPI.Operator>(specification: T, request: FastifyRequest) => {
  debugGroup(`${request.method} ${request.url} | Parsing Operation Parameters`);
  try {
    const params = (specification as any).parameters as Array<any> | undefined;
    const result: any = {
      query: request.query ?? {},
      params: request.params ?? {},
      headers: request.headers ?? {},
    };
    debugLog('PreParsed Parameters', result);
    if (!params) return result;
    for (const param of params) {
      const reqtype = (
        param.in === 'query' ? 'query'
          : param.in === 'path' ? 'params'
            : param.in === 'header' ? 'headers'
              : undefined) as keyof FastifyRequest;
      if (!reqtype) continue;
      const reqObj = request[reqtype] as Record<string, any>;
      const value = reqObj[param.name];
      if (value === undefined || value === null) continue;
      if (param.schema?.type === "integer" || param.schema?.type === "number") {
        const parsed = Number(value);
        result[reqtype][param.name] = Number.isNaN(parsed) ? undefined : parsed;
      }
      else if (param.schema?.type === "boolean") {
        if (typeof value === "string") {
          result[reqtype][param.name] = value === "true";
        } else {
          result[reqtype][param.name] = Boolean(value);
        }
      } else {
        result[reqtype][param.name] = value;
      }
    }
    request.params = result.params;
    request.query = result.query;
    request.headers = result.headers;
    debugLogEnd('PostParsed Parameters', {
      params: request.params,
      query: request.query,
      headers: request.headers,
    });
    return result;
  } catch (error) {
    debugLogEnd('Error Parsing Operation Parameters', error);
    return {
      params: request.params,
      query: request.query,
      headers: request.headers,
    };
  }
}

export const validateRequestBody = <T extends OpenAPI.Operator>(specification: T, request: FastifyRequest) => {
  const ajv = new Ajv();
  const { requestBody } = specification as { requestBody: OpenAPI.RequestBody | undefined };
  if (!requestBody) return { isValid: true };
  const { content, required } = requestBody;
  if (!content && !required) return { isValid: true };
  if (!content) return { isValid: false };
  const { schema } = content['application/json'] as { schema: OpenAPI.Schema };
  const validate = ajv.compile(schema);
  const isValid = validate(request.body);
  return {
    isValid,
    errors: validate.errors,
  };
}

export const validateResponse = <T extends OpenAPI.Operator>(specification: T, response: FastifyReply, payload: any) => {
  const ajv = createAjv();
  const { responses } = specification as unknown as { responses: OpenAPI.Response | undefined };
  if (!responses) return { isValid: true, errors: [] };
  const [, responseSchemaContent] = Object.entries(responses).find(([code, responseSchema]) => code === response.status?.toString()) ?? [];
  const schema = responseSchemaContent?.content?.['application/json']?.schema as OpenAPI.Schema | undefined;
  if (!schema) return { isValid: true, errors: [] };
  const validate = ajv.compile(schema);
  const isValid = validate(payload);
  return {
    isValid,
    errors: validate.errors,
  };
}

export const isDebugMode = () => ['1', 'true'].includes(process.env.DEBUG_OPENAPI_FASTIFY ?? '');
export const debugGroup = (...args: any[]) => {
  if (isDebugMode()) {
    console.group('[openapi-fastify] ', ...args);
  }
}
export const debugLog = (...args: any[]) => {
  if (isDebugMode()) {
    console.log('[openapi-fastify] ', ...args);
  }
}
export const debugLogEnd = (...args: any[]) => {
  if (isDebugMode()) {
    if (args.length > 0) console.log('[openapi-fastify] ', ...args);
    console.groupEnd();
  }
}

export const replacePathWithOpenApiParams = (path: string) => path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");

export const AUTO_VALIDATION_DEFAULTS = {
  config: undefined,
  request: {
    validate: false
  },
  response: {
    validate: false
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

export const getAutoValidateConfig = (autoValidate: AutoValidateConfig = false): {
  config: AjvOptions | undefined,
  request: Exclude<AutoValidateRequestResponseConfig, boolean>,
  response: Exclude<AutoValidateRequestResponseConfig, boolean>,
} => {
  if (!autoValidate) autoValidate = false;
  if (typeof autoValidate === 'boolean') return {
    config: undefined,
    request: { validate: autoValidate },
    response: { validate: autoValidate },
  }
  else if (typeof autoValidate === 'object' && typeof autoValidate !== null) {
    const getReqResConfig = (config?: AutoValidateRequestResponseConfig) => (typeof config === 'boolean' ? { validate: config } : config) || AUTO_VALIDATION_DEFAULTS.request;
    return {
      config: autoValidate.config,
      request: getReqResConfig(autoValidate.request),
      response: getReqResConfig(autoValidate.response),
    }
  }
  return {
    config: undefined,
    request: AUTO_VALIDATION_DEFAULTS.request,
    response: AUTO_VALIDATION_DEFAULTS.response,
  }
}

export const onValidationError = (type: 'request' | 'response', config: AutoValidateConfig | undefined, request: FastifyRequest, reply: FastifyReply, errors: ErrorObject<any>[]) => {
  const autoValidate = getAutoValidateConfig(config);
  if (autoValidate[type]?.onError) return autoValidate[type]?.onError(request, reply, errors);
  else if (autoValidate[type]?.errorResponse) {
    const { status, payload } = autoValidate[type]?.errorResponse;
    return reply.status(status).send(typeof payload === 'function' ? payload(errors || []) : payload);
  }
  if (type === 'request') return reply.status(400).send({ error: "Invalid Request Body", errors });
  else if (type === 'response') return reply.status(500).send({ error: "Internal Server Error" });
  return reply.status(500).send({ error: "Internal Server Error" });
}

export const getOperationPath = (path: string, options?: RouteOptions) => {
  const pathArray = [...options?.prefix?.split('/') ?? '', ...path.split('/')].map(p => p.trim()).filter(Boolean);
  return `/${pathArray.join('/')}`;
}

export const getOperationOptions = ({ operatorOptions = {}, routeOptions = {}, routerOptions = {} }: { operatorOptions: OperatorOptions | undefined, routeOptions: RouteOptions | undefined, routerOptions: RouterOptions | undefined }) => {
  const merge1 = deepMerge(routerOptions, routeOptions);
  return deepMerge(merge1, operatorOptions);
}

export const getDefaultOperationOptions = ({ operatorOptions = {}, routeOptions = {}, routerOptions = {} }: { operatorOptions: OperatorOptions | undefined, routeOptions: RouteOptions | undefined, routerOptions: RouterOptions | undefined }): OperatorOptions => {
  const operatorAutoValidate = getAutoValidateConfig(operatorOptions?.autoValidate);
  const routeAutoValidate = getAutoValidateConfig(routeOptions?.autoValidate);
  const routerAutoValidate = getAutoValidateConfig(routerOptions?.autoValidate);
  return {
    autoValidate: {
      request: {
        validate: operatorAutoValidate?.request?.validate ?? routeAutoValidate?.request?.validate ?? routerAutoValidate?.request?.validate ?? false,
      },
      response: {
        validate: operatorAutoValidate?.response?.validate ?? routeAutoValidate?.response?.validate ?? routerAutoValidate?.response?.validate ?? false,
      },
    },
  }
}

export const getIsRequestBodyRequired = (specification: OpenAPI.Operator): boolean | undefined => {
  const requestBody = (specification as { requestBody?: OpenAPI.RequestBody }).requestBody;
  return !!(requestBody?.required);
}


export const getRequestBodySchema = (contentType: string, specification: OpenAPI.Operator) => {
  const { requestBody } = specification as { requestBody: OpenAPI.RequestBody | undefined };
  if (!requestBody) return undefined;
  const { content } = requestBody;
  if (!content) return undefined;
  return content[contentType]?.schema;
}

export const getResponseSchema = (contentType: string, specification: OpenAPI.Operator, response: FastifyReply) => {
  const { responses } = specification as unknown as { responses: OpenAPI.Response | undefined };
  if (!responses) return undefined;
  const responseSchemaContent = responses?.[response.statusCode.toString() as keyof OpenAPI.Response] as { content?: Record<string, { schema: OpenAPI.Schema }> };
  const schema = responseSchemaContent?.content?.['application/json']?.schema as OpenAPI.Schema | undefined;
  return schema;
}



export const isObject = (value: any): value is Record<string, any> => value !== null && typeof value === 'object' && value.toString() === '[object Object]';