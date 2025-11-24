import { Server } from 'socket.io';

let io: Server | null = null;

export const setIo = (socketIo: Server) => {
  io = socketIo;
};

export const emitToClients = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};