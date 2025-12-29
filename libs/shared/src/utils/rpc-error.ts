import { HttpException, HttpStatus } from '@nestjs/common';

export function handleRpcError(error: any): never {
  console.error('--- RPC ERROR DETAILS ---');
  console.dir(error, { depth: null });

  let status = HttpStatus.INTERNAL_SERVER_ERROR;

  if (error.statusCode) {
    status = Number(error.statusCode);
  } else if (error.status) {
    status = Number(error.status);
  } else if (error.response && error.response.statusCode) {
    status = Number(error.response.statusCode);
  }

  if (isNaN(status)) {
    status = HttpStatus.BAD_REQUEST;
  }

  let message = 'Internal Server Error';
  let errorName = 'Rpc Error';

  if (typeof error === 'string') {
    message = error;
  } else if (error.message) {
    message = error.message;
  }

  if (error.response) {
    if (typeof error.response === 'string') {
      message = error.response;
    } else if (typeof error.response === 'object') {
      if (Array.isArray(error.response.message)) {
        message = error.response.message[0];
      } else if (error.response.message) {
        message = error.response.message;
      }

      if (error.response.error) {
        errorName = error.response.error;
      }
    }
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
