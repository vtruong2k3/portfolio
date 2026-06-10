// Shared API-layer types.

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface SettingValue {
  key: string;
  value: string;
}
