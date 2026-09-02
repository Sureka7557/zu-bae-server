export interface IUser {
  name?: string;
  email: string;
  clerkId?: string;
  image?: string;
  role: "user" | "admin";
  createdAt?: Date;
  updatedAt?: Date;
}