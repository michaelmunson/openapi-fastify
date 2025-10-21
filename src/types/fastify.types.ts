import { FastifyReply, FastifyRequest, RouteGenericInterface } from "fastify";

export type OperatorMethod<T extends RouteGenericInterface, R> = (request:FastifyRequest<T>, reply: FastifyReply<T>) => Promise<R>

