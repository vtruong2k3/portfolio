export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactResponse {
  id: string;
  createdAt: string;
}
