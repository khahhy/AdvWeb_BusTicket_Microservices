export interface IServiceError {
  message: string;
  statusCode?: number;
  status?: number;
  error?: string;
  errors?: ValidationErrors;
}

export type ValidationErrors = Record<string, string[]>;

export interface BaseResponse<T = null> {
  statusCode: number;
  message: string;
  data?: T;
  errors?: ValidationErrors | null;
}

export interface AuthData<TUser = unknown> {
  accessToken: string;
  user: TUser;
  refreshToken?: string;
}
