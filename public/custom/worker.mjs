import { evaluate } from './engine.mjs';
self.onmessage = async ({ data }) => {
  try { self.postMessage({ result: await evaluate(data.source, data.input) }); }
  catch (error) { self.postMessage({ error: String(error.message).slice(0, 500) }); }
};
