// Stock Models
export interface Stock {
  id: number;
  code: string;
  description: string;
  stockEntitiesId: number;
  stockEntities?: StockEntities;
  stockStatusId: number;
  stockStatus?: StockStatus;
  stockSupplierId: number;
  stockSupplier?: StockSupplier;
  createdOn: Date;
  isDeleted: boolean;
}

export interface StockEntities {
  id: number;
  name: string;
}

export interface StockStatus {
  id: number;
  statusName: string;
}

export interface StockSupplier {
  id: number;
  supplierName: string;
}

export interface CreateStockDTO {
  code: string;
  description: string;
  stockEntitiesId: number;
  stockStatusId: number;
  stockSupplierId: number;
}
