import { Routes, Route, Link } from "react-router";
import { Video } from "lucide-react";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";

function App() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/30">
              <Video className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Relay
              <span className="text-indigo-400">Call</span>
            </span>
          </Link>
          <p className="hidden text-xs text-zinc-500 sm:block">
            Peer-to-peer video over WebRTC
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </main>

      <footer className="border-t border-white/5">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-zinc-600 sm:px-6">
          Media stays between peers — the server only exchanges signaling.
        </p>
      </footer>
    </div>
  );
}

export default App;
