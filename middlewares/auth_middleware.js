async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send(err);
  }
}

const authMiddleware = authenticate;

module.exports = { authenticate, authMiddleware };
