import { HttpException, HttpStatus } from '@nestjs/common';

interface RpcErrorResponse {
  statusCode?: number;
  status?: number;
  message?: string | string[];
  error?: string;
}

interface RpcErrorShape {
  error?: RpcErrorResponse;
  statusCode?: number;
  status?: number;
  message?: string;
  response?: string | RpcErrorResponse;
}

export function handleRpcError(error: unknown): never {
  console.error('--- RPC ERROR DETAILS ---');
  console.dir(error, { depth: null });

  const err = error as RpcErrorShape;

  let status = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errorName = 'Rpc Error';

  if (err.error && typeof err.error === 'object') {
    if (err.error.statusCode) {
      status = Number(err.error.statusCode);
    }
    if (typeof err.error.message === 'string') {
      message = err.error.message;
    }
    if (err.error.error) {
      errorName = err.error.error;
    }
  } else if (err.statusCode) {
    status = Number(err.statusCode);
  } else if (err.status) {
    status = Number(err.status);
  } else if (err.response) {
    if (typeof err.response === 'object') {
      const res = err.response;
      if (res.statusCode) status = Number(res.statusCode);

      if (typeof res.message === 'string') {
        message = res.message;
      } else if (Array.isArray(res.message) && res.message.length > 0) {
        message = res.message[0];
      }

      if (res.error) errorName = res.error;
    } else if (typeof err.response === 'string') {
      message = err.response;
    }
  }

  if (status === HttpStatus.INTERNAL_SERVER_ERROR && err.message) {
    message = err.message;
  }

  if (isNaN(status)) {
    status = HttpStatus.INTERNAL_SERVER_ERROR;
  }

  throw new HttpException(
    {
      statusCode: status,
      message: message,
      error: errorName,
    },
    status,
  );
}
