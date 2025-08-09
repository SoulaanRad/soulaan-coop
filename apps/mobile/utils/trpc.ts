import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

import type { AppRouter } from '@repo/trpc/router';

export const trpc = createTRPCReact<AppRouter>();

export function getBaseUrl() {
  if (process.env.API_SERVER) {
    return process.env.API_SERVER;
  }
  return 'http://localhost:5001';
}

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
    }),
  ],
});