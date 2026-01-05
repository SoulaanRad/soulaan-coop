import { NextResponse } from "next/server";

const mockRedemptions = [
  {
    id: "req-1",
    user: "0x1234AbCd1234AbCd1234AbCd1234AbCd1234AbCd",
    amount: "100 UC",
    date: "2023-10-26",
    status: "Pending",
  },
  {
    id: "req-2",
    user: "0x5678EfGh5678EfGh5678EfGh5678EfGh5678EfGh",
    amount: "250 UC",
    date: "2023-10-25",
    status: "Pending",
  },
  {
    id: "req-3",
    user: "0x9012IjKl9012IjKl9012IjKl9012IjKl9012IjKl",
    amount: "1200 UC",
    date: "2023-10-26",
    status: "Needs Review",
    reason: "High amount",
  },
];

export function GET() {
  // In a real app, you'd fetch this from your smart contract events or a database
  return NextResponse.json(mockRedemptions);
}
