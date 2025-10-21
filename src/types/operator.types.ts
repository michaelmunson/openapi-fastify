// Base type converter with support for more primitive types
export type StringTypeToType<T> =
T extends ‘string’ ? string
: T extends ‘number’ ? number
: T extends ‘integer’ ? number
: T extends ‘boolean’ ? boolean
: T extends ‘null’ ? null
: T extends ‘array’ ? any[]
: T extends ‘object’ ? Record<string, any>
: any;

// Main schema converter with full nested support
export type SchemaToType<Schema> =
// Handle references ($ref)
Schema extends { $ref: string }
? any // References would need a lookup mechanism

// Handle allOf (intersection types)
: Schema extends { allOf: infer Schemas extends readonly any[] }
? UnionToIntersection<{ [K in keyof Schemas]: SchemaToType<Schemas[K]> }[number]>

// Handle anyOf/oneOf (union types)
: Schema extends { anyOf: infer Schemas extends readonly any[] }
? { [K in keyof Schemas]: SchemaToType<Schemas[K]> }[number]
: Schema extends { oneOf: infer Schemas extends readonly any[] }
? { [K in keyof Schemas]: SchemaToType<Schemas[K]> }[number]

// Handle enum types
: Schema extends { enum: infer EnumValues extends readonly any[] }
? EnumValues[number]

// Handle const values
: Schema extends { const: infer ConstValue }
? ConstValue

// Handle arrays with typed items
: Schema extends { type: ‘array’; items: infer Items }
? Array<SchemaToType<Items>>

// Handle objects with properties
: Schema extends { type: ‘object’; properties: infer Props }
? {
[K in keyof Props as K extends RequiredKey<Schema, K> ? K : never]: SchemaToType<Props[K]>
} & {
[K in keyof Props as K extends RequiredKey<Schema, K> ? never : K]?: SchemaToType<Props[K]>
} & (Schema extends { additionalProperties: infer Additional }
? Additional extends false
? {}
: Additional extends { type: any }
? { [key: string]: SchemaToType<Additional> }
: { [key: string]: any }
: {})

// Handle objects without explicit properties (but with additionalProperties)
: Schema extends { type: ‘object’; additionalProperties: infer Additional }
? Additional extends false
? Record<string, never>
: Additional extends { type: any }
? Record<string, SchemaToType<Additional>>
: Record<string, any>

// Handle primitive types with format support
: Schema extends { type: infer Type; format?: infer Format }
? Type extends ‘string’
? Format extends ‘date’ | ‘date-time’ | ‘time’
? string // Could be Date if you want runtime conversion
: Format extends ‘binary’ | ‘byte’
? string | Blob
: string
: StringTypeToType<Type>

// Handle pure type without properties
: Schema extends { type: infer Type }
? StringTypeToType<Type>

// Default fallback
: any;

// Helper type to determine required keys
type RequiredKey<Schema, K> =
Schema extends { required: infer Req extends readonly any[] }
? K extends Req[number]
? K
: never
: never;

// Helper type for intersection (allOf support)
type UnionToIntersection<U> =
(U extends any ? (x: U) => void : never) extends (x: infer I) => void
? I
: never;

// Updated request body converter
export type RequestBodyToRecord<T extends OpenApiRequestBody> =
T extends {
content: {
‘application/json’: {
schema: infer Schema
}
}
}
? SchemaToType<Schema>
: T extends {
content: {
‘application/x-www-form-urlencoded’: {
schema: infer Schema
}
}
}
? SchemaToType<Schema>
: T extends {
content: {
‘multipart/form-data’: {
schema: infer Schema
}
}
}
? SchemaToType<Schema>
: any;

// Type for OpenAPI request body (you may already have this defined)
export type OpenApiRequestBody = {
content?: {
[contentType: string]: {
schema?: any;
};
};
required?: boolean;
};

// Legacy alias for backward compatibility
export type SchemaToRecord<Schema> = SchemaToType<Schema>;