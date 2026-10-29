import 'server-only';
export function serverEnv(name: string) { return process.env[name] || ''; }
