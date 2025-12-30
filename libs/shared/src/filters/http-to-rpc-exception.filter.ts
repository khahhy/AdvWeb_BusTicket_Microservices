import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(HttpException)
export class HttpToRpcExceptionFilter implements RpcExceptionFilter<HttpException> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch(exception: HttpException, _host: ArgumentsHost): Observable<never> {
    const status = exception.getStatus();
    const response = exception.getResponse();

    let message = 'Internal server error';
    let errorName = 'Error';

    if (typeof response === 'string') {
      message = response;
    } else if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else if (
        Array.isArray(responseObj.message) &&
        responseObj.message.length > 0
      ) {
        message = (responseObj.message as string[])[0];
      }

      if (typeof responseObj.error === 'string') {
        errorName = responseObj.error;
      }
    }

    if (errorName === 'Error') {
      errorName = exception.name;
    }

    const rpcError = {
      statusCode: status,
      message: message,
      error: errorName,
    };

    console.log(`[Filter] Http ${status} -> RpcException: ${message}`);

    return throwError(() => new RpcException(rpcError));
  }
}
