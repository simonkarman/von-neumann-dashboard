const sessionId = process.env.SESSION_ID || "";
if (sessionId && !/^[a-f0-9]{24}$/.test(sessionId))
  throw new Error("Invalid SESSION_ID");
export default {
  agentRules: false,
  outputFileTracingRoot: process.cwd(),
  basePath: sessionId ? `/${sessionId}` : "",
  devIndicators: false,
  allowedDevOrigins: [process.env.PUBLIC_HOST || "localhost"],
  poweredByHeader: false,
};
