import fp from 'fastify-plugin'

/**
 * Tolerate an empty body on application/json requests by treating it as `{}`.
 *
 * This lets endpoints whose body is entirely optional (e.g. a full refund with
 * no amount) be called with no body, instead of Fastify's default 400
 * "Body cannot be empty when content-type is set to 'application/json'".
 *
 * Note: the webhook route registers its own (buffer) parser in its own scope,
 * which takes precedence there, so signature verification is unaffected.
 */
export default fp(async (fastify) => {
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (body === '' || body === undefined || body === null) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });
});
