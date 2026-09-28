import crypto from 'node:crypto';

type SocketTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
  aud: 'coderoom-socket';
};

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getSecret() {
  const secret = process.env.SOCKET_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'SOCKET_TOKEN_SECRET must be configured and at least 32 characters long.'
    );
  }

  return secret;
}

function signPayload(encodedPayload: string) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createSocketToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);

  const payload: SocketTokenPayload = {
    sub: userId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    aud: 'coderoom-socket',
  };

  const encodedPayload = Buffer
    .from(JSON.stringify(payload))
    .toString('base64url');

  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySocketToken(token: string) {
  const parts = token.split('.');

  if (parts.length !== 2) {
    throw new Error('Invalid socket token.');
  }

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = signPayload(encodedPayload);

  const providedBuffer = Buffer.from(providedSignature, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid socket token signature.');
  }

  let payload: SocketTokenPayload;

  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
  } catch {
    throw new Error('Invalid socket token payload.');
  }

  if (
    !payload ||
    typeof payload.sub !== 'string' ||
    payload.aud !== 'coderoom-socket'
  ) {
    throw new Error('Invalid socket token payload.');
  }

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new Error('Socket token expired.');
  }

  return payload;
}
