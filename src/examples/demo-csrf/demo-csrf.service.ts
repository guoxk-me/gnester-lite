import { Injectable } from '@nestjs/common';

import { CsrfService } from '../../platform/security/csrf/csrf.service';
import { CreateDemoCsrfTransferDto } from './dto/create-demo-csrf-transfer.dto';
import { DemoCsrfOverviewDto } from './dto/demo-csrf-overview.dto';
import { DemoCsrfTransferPreviewDto } from './dto/demo-csrf-transfer-preview.dto';

@Injectable()
export class DemoCsrfService {
  constructor(private readonly csrfService: CsrfService) {}

  getOverview(): DemoCsrfOverviewDto {
    // AI modified: the overview follows the same configurable header used by middleware and OpenAPI.
    const headerName = this.csrfService.getHeaderName();

    return {
      middleware: 'csrf-csrf',
      tokenEndpoint: 'GET /demo-csrf/token',
      protectedEndpoint: 'POST /demo-csrf/transfer-preview',
      headerName,
      scenarios: [
        'Cookie-backed browser sessions that mutate server state',
        'Browser APIs that rely on same-origin cookies for authentication',
        'Admin panels and dashboards that submit POST, PUT, PATCH, or DELETE requests',
      ],
      notNeededFor: [
        'Pure Authorization header APIs where browsers do not attach credentials automatically',
        'Machine-to-machine webhook endpoints protected by HMAC signatures',
        'Public read-only endpoints using GET, HEAD, or OPTIONS',
      ],
      notes: [
        `Fetch a token first, then send it in the ${headerName} header on unsafe methods.`,
        'While CSRF is enabled, this template applies the middleware to every POST, PUT, PATCH, and DELETE route.',
        'The token cookie is httpOnly; the readable copy is returned in the token response body.',
        'CSRF protects browser credential replay, not XSS or missing authorization checks.',
      ],
    };
  }

  previewTransfer(dto: CreateDemoCsrfTransferDto): DemoCsrfTransferPreviewDto {
    return {
      accepted: true,
      protectedBy: 'csrf-csrf',
      recipient: dto.recipient,
      amount: dto.amount,
    };
  }
}
