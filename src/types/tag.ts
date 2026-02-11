export interface Tag {
    id: number;
    name: string;
    description?: string;
    sample?: string;
    color?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TagInput {
    name: string;
    description?: string;
    color?: string;
    sample?:string;
}
