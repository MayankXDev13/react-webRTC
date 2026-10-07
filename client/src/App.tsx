import React from 'react'
import "./App.css"
import { Routes, Route } from "react-router"
import Lobby from './pages/Lobby'
import Room from './pages/Room'

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </div>
  )
}

export default App