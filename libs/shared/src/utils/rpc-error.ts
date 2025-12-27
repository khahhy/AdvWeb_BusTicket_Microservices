import { HttpException, HttpStatus } from '@nestjs/common';
import { IServiceError } from '@app/shared/type';

export function handleRpcError(error: unknown): never {
  const err = error as IServiceError;

  let status = HttpStatus.BAD_REQUEST;

  if (err.statusCode) {
    status = Number(err.statusCode);
  } else if (err.status) {
    status = Number(err.status);
  }

  if (isNaN(status)) {
    status = HttpStatus.BAD_REQUEST;
  }

  throw new HttpException(
    {
      statusCode: status,
      message: err.message || 'Internal Server Error',
      error: err.error || 'Rpc Error',
    },
    status,
  );
}
