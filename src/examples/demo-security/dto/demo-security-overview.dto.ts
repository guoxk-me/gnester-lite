import { DemoSecurityHeaderDto } from './demo-security-header.dto';

export class DemoSecurityOverviewDto {
  readonly middleware!: string;
  readonly registration!: string;
  readonly headers!: DemoSecurityHeaderDto[];
  readonly scenarios!: string[];
  readonly notes!: string[];
}
