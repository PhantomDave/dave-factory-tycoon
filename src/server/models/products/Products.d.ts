export interface Product {
    type: string;
    value: number;
    create(position: Vector3): Model;
}