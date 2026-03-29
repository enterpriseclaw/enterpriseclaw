export interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  url?: string;
  tags?: string[];
}

export type CreateResourceData = Omit<Resource, "id">;
export type UpdateResourceData = Partial<CreateResourceData>;
