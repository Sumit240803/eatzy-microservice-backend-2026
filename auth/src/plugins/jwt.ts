import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import config from '../config/env'

/**
 * Registers @fastify/jwt for signing tokens.
 *
 * The same JWT_SECRET must be configured on the gateway so that tokens issued
 * here can be verified there before requests are proxied to downstream services.
 */
export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret : config.jwt.secret
  })
})
