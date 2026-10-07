import { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
    const socket = useContext(SocketContext);
    return socket
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const socket = useMemo(() => {
        const sockect = io("http://localhost:8000");
        return sockect;
    }, []);
    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}
