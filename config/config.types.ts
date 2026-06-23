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

export interface QueueConfig {
  readonly enabled: boolean;
  readonly prefix: string;
  readonly defaultAttempts: number;
  readonly backoffDelay: number;
  readonly removeOnComplete: number;
  readonly removeOnFail: number;
}

export interface YamlConfig {
  readonly app: AppConfig;
  readonly cache: CacheConfig;
  readonly queue: QueueConfig;
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
