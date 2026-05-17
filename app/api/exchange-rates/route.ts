import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Exchange rates sync placeholder endpoint." },
    { status: 200 }
  );
}
