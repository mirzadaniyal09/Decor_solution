import mongoose from 'mongoose';

let connectionPromise;

export async function connectDb() {
    if (mongoose.connection.readyState === 1) return;
    if (mongoose.connection.readyState === 2 && connectionPromise) return connectionPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set');
    }

    if (uri === 'memory') {
        throw new Error('MONGODB_URI=memory is not supported by the database-backed API');
    }

    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000,
    }).then(() => undefined).catch((error) => {
        connectionPromise = undefined;
        throw error;
    });

    return connectionPromise;
}
