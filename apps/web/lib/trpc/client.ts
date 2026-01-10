import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@repo/trpc/router';

export const api = createTRPCReact<AppRouter>();
