// CN: 服务，承载 demo-crypto 的业务逻辑；EN: Service holds business logic for demo-crypto.
import { Injectable } from '@nestjs/common';

import { HmacSignatureService } from '../../common/crypto/hmac-signature.service';
import { SecureTokenService } from '../../common/crypto/secure-token.service';
import { SymmetricEncryptionService } from '../../common/crypto/symmetric-encryption.service';
import { DemoCryptoScenarioDto } from './dto/demo-crypto-scenario.dto';
import { DemoEncryptedSecretDto } from './dto/demo-encrypted-secret.dto';
import { DemoOneTimeTokenDto } from './dto/demo-one-time-token.dto';
import { DemoWebhookSignatureDto } from './dto/demo-webhook-signature.dto';

const DEMO_SECRET = 'provider-token';
const DEMO_AUTHENTICATED_CONTEXT = 'demo-crypto:tenant:acme';
const DEMO_WEBHOOK_PAYLOAD = '{"event":"demo.created","id":"demo-1"}';
const TAMPERED_WEBHOOK_PAYLOAD = '{"event":"demo.deleted","id":"demo-1"}';

@Injectable()
export class DemoCryptoService {
  // CN: 初始化 demo-crypto 的依赖和运行状态；EN: Initializes dependencies and runtime state for demo-crypto.
  constructor(
    private readonly encryptionService: SymmetricEncryptionService,
    private readonly tokenService: SecureTokenService,
    private readonly hmacSignatureService: HmacSignatureService,
  ) {}

  // CN: 执行 demo-crypto 的 get scenarios 业务逻辑；EN: Runs the get scenarios business logic for demo-crypto.
  getScenarios(): DemoCryptoScenarioDto[] {
    return [
      {
        name: 'Authenticated encryption',
        method: 'POST',
        route: '/demo-crypto/encrypt-secret',
        useCase:
          'Encrypt a recoverable third-party token or private setting before database storage.',
        nestPattern:
          'Inject SymmetricEncryptionService from CommonCryptoModule and bind ciphertext to an authenticated context.',
      },
      {
        name: 'One-time token storage',
        method: 'POST',
        route: '/demo-crypto/one-time-token',
        useCase:
          'Issue a reset, invite, or verification token once while storing only a digest.',
        nestPattern:
          'Generate a URL-safe random token and persist SecureTokenService.hashToken(token).',
      },
      {
        name: 'HMAC payload signature',
        method: 'POST',
        route: '/demo-crypto/webhook-signature',
        useCase:
          'Sign webhook or internal callback payloads so receivers can reject tampering.',
        nestPattern:
          'Sign the raw payload string and verify with timing-safe comparison.',
      },
    ];
  }

  // CN: 执行 demo-crypto 的 encrypt secret 业务逻辑；EN: Runs the encrypt secret business logic for demo-crypto.
  encryptSecret(): DemoEncryptedSecretDto {
    const encrypted = this.encryptionService.encryptString(
      DEMO_SECRET,
      DEMO_AUTHENTICATED_CONTEXT,
    );
    const decrypted = this.encryptionService.decryptString(
      encrypted,
      DEMO_AUTHENTICATED_CONTEXT,
    );

    return {
      scenario: 'Encrypt a recoverable secret',
      encrypted,
      decryptedPreview: this.preview(decrypted),
      authenticatedContext: DEMO_AUTHENTICATED_CONTEXT,
    };
  }

  // CN: 执行 demo-crypto 的 issue one time token 业务逻辑；EN: Runs the issue one time token business logic for demo-crypto.
  issueOneTimeToken(): DemoOneTimeTokenDto {
    const token = this.tokenService.generateUrlSafeToken();
    const storedDigest = this.tokenService.hashToken(token);

    return {
      scenario: 'Issue a one-time token',
      tokenPreview: this.preview(token),
      storedDigest,
      verifies: this.tokenService.verifyToken(token, storedDigest),
    };
  }

  // CN: 执行 demo-crypto 的 sign webhook 业务逻辑；EN: Runs the sign webhook business logic for demo-crypto.
  signWebhook(): DemoWebhookSignatureDto {
    const signature = this.hmacSignatureService.sign(DEMO_WEBHOOK_PAYLOAD);

    return {
      scenario: 'Sign a webhook payload',
      payload: DEMO_WEBHOOK_PAYLOAD,
      signature,
      verifiesOriginalPayload: this.hmacSignatureService.verify(
        DEMO_WEBHOOK_PAYLOAD,
        signature,
      ),
      rejectsTamperedPayload: !this.hmacSignatureService.verify(
        TAMPERED_WEBHOOK_PAYLOAD,
        signature,
      ),
    };
  }

  // CN: 执行 demo-crypto 的 preview 业务逻辑；EN: Runs the preview business logic for demo-crypto.
  private preview(value: string): string {
    return `${value.slice(0, 8)}...`;
  }
}
