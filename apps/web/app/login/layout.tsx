import { Web3Provider } from '@/lib/web3-provider';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Web3Provider>{children}</Web3Provider>;
}
