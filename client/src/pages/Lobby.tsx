import React, { useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router"

function Lobby() {
    const [email, setEmail] = useState<string>("");
    const [room, setRoom] = useState<string>("");

    const socket = useSocket();
    const navigate = useNavigate();

    const handleSubmitForm = useCallback(
        (e: React.ChangeEvent<HTMLFormElement>) => {
            e.preventDefault();
            socket.emit("room:join", { email, room });

            setEmail("");
            setRoom("");
        },
        [email, room, socket],
    );

    const handleJoinRoom = useCallback(
        (data: { email: string; room: string }) => {
            const { email, room } = data;

            sessionStorage.setItem("email", email);
            navigate(`/room/${room}`, { state: { email } });
        },
        [navigate],
    );

    useEffect(() => {
        socket.on("room:join", handleJoinRoom);
        return () => {
            socket.off("room:join", handleJoinRoom);
        };
    }, [socket, handleJoinRoom]);

    return (
        <div>
            <h1>Lobby</h1>
            <form onSubmit={handleSubmitForm}>
                <div>
                    <label htmlFor="email">Email ID</label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Email ID"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEmail(e.target.value)
                        }
                    />
                </div>
                <div>
                    <label htmlFor="room">Room Number</label>
                    <input
                        type="text"
                        name="room"
                        id="room"
                        placeholder="Room Number"
                        value={room}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRoom(e.target.value)
                        }
                    />
                </div>
                <button type="submit">Join Room</button>
            </form>
        </div>
    );
}

export default Lobby;
