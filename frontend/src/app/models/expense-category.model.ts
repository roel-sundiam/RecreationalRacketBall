export interface ExpenseCategory {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  color?: string;
  icon?: string;
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  updatedBy?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDto extends CreateCategoryDto {
  displayOrder?: number;
}

export interface CategoryUsageResponse {
  usageCount: number;
}
