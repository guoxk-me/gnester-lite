// CN: 类型文件，描述 passport-local 校验成功后的用户契约；EN: Type for the user returned by passport-local validation.
export interface LocalAuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}
