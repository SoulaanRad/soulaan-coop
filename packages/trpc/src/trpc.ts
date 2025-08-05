import {initTRPC} from '@trpc/server'

// Dynamic import for superjson to avoid ESM/CJS issues
const SuperJson = await import('superjson').then(m => m.default);

export const t = initTRPC.context<{}>().create({
    transformer: SuperJson,
  });
  


export const router = t.router;
export const procedure = t.procedure;
