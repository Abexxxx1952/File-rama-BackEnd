import 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    locals?: {
      requestData?: any;
      responseData?: any;
    };
  }
}
