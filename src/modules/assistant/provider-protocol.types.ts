export interface CatalogModel {
  id: string;
  input_modalities?: string[];
  output_modalities?: string[];
}

export interface CatalogResponse {
  data?: CatalogModel[];
}

export interface BalanceResponse {
  balance_infos?: { currency: string; total_balance: string }[];
}
