const BASE_URL = process.env.SHIPSAFER_BASE_URL;
const TOKEN = process.env.SHIPSAFER_SLACKBOT_TOKEN;
const AUTH_COOKIE = process.env.SHIPSAFER_AUTH_COOKIE;
const SCAN_PATH = '/api/v1/slack/scan';
const STATUS_PATH = '/api/v1/slack/scan-status';

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

  const url = `${BASE_URL}${path}`;

  // Helpful for debugging from Railway logs
  console.log('ShipSafer request', {
    url,
    method: options.method || 'GET',
  });

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const msg =
      json.error ||
      json.message ||
      json.detail ||
      res.statusText;
    throw new Error(`ShipSafer error (${res.status}): ${msg}`);
  }

  return json;
}

async function triggerShipSaferScan(input) {
  const body = JSON.stringify(input);

  // Per Shipsafer docs: POST /api/v1/slack/scan with JSON body
  return shipsaferFetch(SCAN_PATH, {
    method: 'POST',
    body,
  });
}

async function getShipSaferStatus(domain) {
  const url = `${STATUS_PATH}?domain=${encodeURIComponent(
    domain
  )}`;
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
