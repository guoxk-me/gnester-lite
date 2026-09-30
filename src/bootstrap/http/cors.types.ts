export interface CorsOptions {
  readonly origin: string | string[];
  readonly credentials: boolean;
  readonly methods: string[];
  readonly allowedHeaders?: string[];
  readonly exposedHeaders?: string[];
  readonly maxAge: number;
  readonly optionsSuccessStatus: number;
}
