const BASE_URL = process.env.SHIPSAFER_BASE_URL;
const TOKEN = process.env.SHIPSAFER_SLACKBOT_TOKEN;
const AUTH_COOKIE = process.env.SHIPSAFER_AUTH_COOKIE;

async function shipsaferFetch(path, options = {}) {
  if (!BASE_URL || !TOKEN) {
    throw new Error('ShipSafer not configured: missing SHIPSAFER_BASE_URL or SHIPSAFER_SLACKBOT_TOKEN');
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (AUTH_COOKIE) {
    headers.Cookie = AUTH_COOKIE;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const msg = json.error || res.statusText;
    throw new Error(`ShipSafer error (${res.status}): ${msg}`);
  }

  return json;
}

async function triggerShipSaferScan(input) {
  const body = JSON.stringify(input);
  return shipsaferFetch('/api/v1/slack/scan', {
    method: 'POST',
    body,
  });
}

async function getShipSaferStatus(domain) {
  const url = `/api/v1/slack/scan-status?domain=${encodeURIComponent(domain)}`;
  return shipsaferFetch(url);
}

function formatScanResponse(domain, resp) {
  const scans = resp.data?.scans || [];
  const lines = [];

  lines.push(`*ShipSafer scan started for* \`${domain}\``);

  for (const s of scans) {
    const f = s.summary || {};
    lines.push(
      `• \`${s.scanType}\`: score *${s.score}*/100 ` +
      `(crit: ${f.critical ?? 0}, high: ${f.high ?? 0}, med: ${f.medium ?? 0}, low: ${f.low ?? 0})`
    );
  }

  if (resp.data?.failedScanTypes?.length) {
    lines.push(`_Failed scan types:_ ${resp.data.failedScanTypes.join(', ')}`);
  }

  return lines.join('\n');
}

function formatStatusResponse(resp) {
  const d = resp.data;

  if (!d) {
    return 'No status data available.';
  }

  return (
    `*ShipSafer status for* \`${d.domain}\`:\n` +
    `• Grade: *${d.grade}* (score ${d.score}/100)\n` +
    `• Last scan: \`${d.scanType}\` at \`${d.lastScan}\`\n` +
    `• Findings — crit: ${d.findings?.critical ?? 0}, high: ${d.findings?.high ?? 0}, ` +
    `med: ${d.findings?.medium ?? 0}, low: ${d.findings?.low ?? 0}`
  );
}

module.exports = {
  triggerShipSaferScan,
  getShipSaferStatus,
  formatScanResponse,
  formatStatusResponse,
};
