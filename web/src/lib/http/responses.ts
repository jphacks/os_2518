import { NextResponse } from 'next/server';

type SuccessResponse<T> = {
  success: true;
  data: T;
};

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<SuccessResponse<T>>(
    {
      success: true,
      data,
    },
    init,
  );
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function error(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
