import { DataSource } from 'typeorm';
import { UserEntity } from './users/users.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some PostgreSQL providers
  },
  entities: [UserEntity],
  synchronize: false, // Important: Keep false in production
});