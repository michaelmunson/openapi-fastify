import { OpenApiPathOperator } from "./types";

const ERROR_CONTENT = {
  'application/json': {
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'string',
        },
      },
    },
  },
}

export const DEFAULT_RESPONSES = {
  400: {
    description: 'Bad Request',
    content: ERROR_CONTENT,
  },
  401: {
    description: 'Unauthorized',
    content: ERROR_CONTENT,
  }
}

export const OPERATOR_NAMES = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

export const modifyOperatorSpec = (spec: OpenApiPathOperator) => ({
  security: [
    {
      ApiKeyAuth: []
    },
    {
      BearerAuth: []
    }
  ],
  ...spec,
  response: spec.responses,
  body: spec.requestBody,
})