import { DataSource } from 'typeorm';
import { UserEntity } from './users/users.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'mydatabase',
  entities: [UserEntity ],
  synchronize: true, // set to false in production
});