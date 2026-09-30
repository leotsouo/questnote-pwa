import webpush from 'web-push';

export async function sendPush(subscription, payload, env, ttl = 3600, fetcher = fetch) {
  const request = webpush.generateRequestDetails(subscription, JSON.stringify(payload), {
    vapidDetails: { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
    TTL: Math.max(1, Math.min(3600, Math.floor(ttl))), contentEncoding: 'aes128gcm', urgency: 'normal',
  });
  const response = await fetcher(request.endpoint, {
    method: request.method, headers: request.headers, body: request.body,
    redirect: 'manual', signal: AbortSignal.timeout(10000),
  });
  const retry = response.headers.get('Retry-After');
  const retrySeconds = /^\d+$/.test(retry || '') ? Number(retry) : Math.max(0, (Date.parse(retry) - Date.now()) / 1000);
  if (response.body) await response.body.cancel();
  return { status: response.status, retrySeconds: Number.isFinite(retrySeconds) ? retrySeconds : 60 };
}
