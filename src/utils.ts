import { FastifyReply, FastifyRequest } from "fastify";
import { OpenAPI, FromSpec } from "./types";
import { RouterOptions } from "./types/router.types";
import Ajv from "ajv";

export const OPERATOR_NAMES = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

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


/* export const modifyHandler = <T extends OpenAPI.Operator>(specification: T, method: FromSpec.Method<T>, options:RouterOptions): FromSpec.Method<T> => {
  const {
    parseQueryParams:isParseQueryParams,
    enforceRequestBodySchema:isEnforceRequestBodySchema,
    parseRequestBody:isParseRequestBody
  } = options;
  
  if (!isParseQueryParams && !isEnforceRequestBodySchema && !isParseRequestBody)
    return method;
  
  return async (...params: Parameters<FromSpec.Method<T>>): Promise<FromSpec.Response<T>> => {
    const [request, reply] = params;
    if (isParseQueryParams) {
      const newQuery = parseQueryParams(specification, request as FastifyRequest);
      request.query = newQuery as any;
    }
    if (isEnforceRequestBodySchema) {
      const {isValid, errors} = validateRequestBody(specification, request as FastifyRequest);
      if (!isValid) {
        reply.status(400);
        return {error: "Invalid request body", errors} as FromSpec.Response<T>;
      }
    }
    if (isParseRequestBody) {
      const newBody = parseRequestBody(specification, request as FastifyRequest);
      request.body = newBody as any;
    }

    return await method(request, reply);
  }
}
 */

export const replacePathWithOpenApiParams = (path: string) => path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");