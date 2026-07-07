// CN: 服务，承载 demo-csrf 的业务逻辑；EN: Service holds business logic for demo-csrf.
import { Injectable } from '@nestjs/common';

import { CreateDemoCsrfTransferDto } from './dto/create-demo-csrf-transfer.dto';
import { DemoCsrfOverviewDto } from './dto/demo-csrf-overview.dto';
import { DemoCsrfTransferPreviewDto } from './dto/demo-csrf-transfer-preview.dto';

@Injectable()
export class DemoCsrfService {
  // CN: 执行 demo-csrf 的 get overview 业务逻辑；EN: Runs the get overview business logic for demo-csrf.
  getOverview(): DemoCsrfOverviewDto {
    return {
      middleware: 'csrf-csrf',
      tokenEndpoint: 'GET /demo-csrf/token',
      protectedEndpoint: 'POST /demo-csrf/transfer-preview',
      headerName: 'x-csrf-token',
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
        'Fetch a token first, then send it in the x-csrf-token header on unsafe methods.',
        'The token cookie is httpOnly; the readable copy is returned in the token response body.',
        'CSRF protects browser credential replay, not XSS or missing authorization checks.',
      ],
    };
  }

  // CN: 执行 demo-csrf 的 preview transfer 业务逻辑；EN: Runs the preview transfer business logic for demo-csrf.
  previewTransfer(dto: CreateDemoCsrfTransferDto): DemoCsrfTransferPreviewDto {
    return {
      accepted: true,
      protectedBy: 'csrf-csrf',
      recipient: dto.recipient,
      amount: dto.amount,
    };
  }
}
