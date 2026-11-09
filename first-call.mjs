// First manseryeok call from Node (no dependencies).
// Run: node --env-file=.env first-call.mjs   (or export HRUM_API_KEY first)
const key = process.env.HRUM_API_KEY;
if (!key) {
  console.error('HRUM_API_KEY is empty. Copy .env.example to .env and put your key there.');
  process.exit(1);
}

const res = await fetch('https://api.hrum.ai/api/v1/partners/v1/manseryeok', {
  method: 'POST',
  headers: {
    'X-Partner-Api-Key': key,
    'Content-Type': 'application/json',
    'User-Agent': 'hrum-saju-example/0.1',
  },
  body: JSON.stringify({ year: 1990, month: 5, day: 15, hour: 12, minute: 0, timezone: 'Asia/Seoul', gender: 'male' }),
});
const body = await res.json();
if (!body.success) {
  console.error(`HRUM error: ${body.statusCode} ${body.code ?? ''}`);
  process.exit(1);
}

const { wonkuk, ohaengBalance, yongshin, ilganSummary } = body.data;
for (const name of ['year', 'month', 'day', 'hour']) {
  const p = wonkuk[name];
  console.log(name.padEnd(5), p ? `${p.stemHanja}${p.branchHanja} (${p.stem}${p.branch}, ${p.ohaeng})` : '-');
}
console.log('ohaeng', ohaengBalance);
console.log('yongshin', yongshin);
console.log('ilgan', ilganSummary);
