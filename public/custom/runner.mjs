// Executed in a disposable no-network, no-mount container in Docker deployments.
import { evaluate } from './engine.mjs';
let body = '';
for await (const chunk of process.stdin) {
  body += chunk;
  if (body.length > 350000) throw new Error('Input too large');
}
try {
  const { source, input } = JSON.parse(body);
  const first = await evaluate(source, input);
  for (const control of first.view.controls || [])
    await evaluate(source, { ...input, state: first.state, event: { type: 'control', id: control.id } });
  // Also ensure empty data and a second render don't break the component.
  await evaluate(source, { data: Object.fromEntries(Object.keys(input.data).map(k => [k, { items: [], points: [] }])), state: null, event: null });
  process.stdout.write(JSON.stringify({ result: first, checks: ['initial render', 'declared controls', 'empty data'] }));
} catch (error) { process.stdout.write(JSON.stringify({ error: String(error.message).slice(0, 500) })); process.exitCode = 1; }
