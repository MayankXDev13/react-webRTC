import { createContext, useMemo, useContext } from "react";
import { io, type Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = (): Socket => {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return socket;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useMemo(() => {
    return io("http://localhost:8000");
  }, []);
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
