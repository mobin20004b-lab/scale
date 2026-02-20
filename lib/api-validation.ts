import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      fieldErrors: error.flatten().fieldErrors,
    },
    { status: 422 },
  );
}
