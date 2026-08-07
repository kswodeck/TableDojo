import mongoose from 'mongoose';
import { env } from '../config/env.js';

mongoose.set('strictQuery', true);

export async function connectToDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  mongoose.connection.on('error', (error) => {
    console.error('[db] connection error:', error);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    // Fail fast instead of buffering queries forever when Mongo is unreachable,
    // which is how the old app appeared to hang rather than report an outage.
    bufferCommands: false,
  });

  console.log('[db] connected');
  return mongoose;
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
