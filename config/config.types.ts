// CN: 类型文件，描述 configuration 的 TypeScript 契约；EN: Type file describes TypeScript contracts for configuration.
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export enum DbConnection {
  MYSQL = 'mysql',
}

export interface AppConfig {
  readonly name: string;
}

export interface CacheConfig {
  readonly ttl: number;
}

export interface ScheduleConfig {
  readonly enabled: boolean;
  readonly timeZone: string;
}

export interface QueueConfig {
  readonly enabled: boolean;
  readonly prefix: string;
  readonly defaultAttempts: number;
  readonly backoffDelay: number;
  readonly removeOnComplete: number;
  readonly removeOnFail: number;
}

export interface HttpConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly maxRedirects: number;
  readonly maxContentLength: number;
  readonly maxBodyLength: number;
}

export interface RateLimitThrottlerConfig {
  readonly name: string;
  readonly ttl: number;
  readonly limit: number;
  readonly blockDuration?: number;
}

export interface RateLimitConfig {
  readonly enabled: boolean;
  readonly trustProxy: string;
  readonly errorMessage: string;
  readonly throttlers: RateLimitThrottlerConfig[];
}

export interface YamlConfig {
  readonly app: AppConfig;
  readonly cache: CacheConfig;
  readonly schedule: ScheduleConfig;
  readonly queue: QueueConfig;
  readonly http: HttpConfig;
  readonly rateLimit: RateLimitConfig;
}

export interface DatabaseOptions {
  readonly name?: string;
  readonly type: DbConnection;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
  readonly entities: string[];
  readonly migrations: string[];
  readonly synchronize: boolean;
  readonly autoLoadEntities: boolean;
  readonly retryAttempts: number;
  readonly retryDelay: number;
}
