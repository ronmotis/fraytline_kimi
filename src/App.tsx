import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import Today from './pages/Today'
import Movements from './pages/Movements'
import MovementDetail from './pages/MovementDetail'
import Quotes from './pages/Quotes'
import Dispatch from './pages/Dispatch'
import Memory from './pages/Memory'
import Actions from './pages/Actions'
import Exchange from './pages/Exchange'
import Network from './pages/Network'
import Settings from './pages/Settings'
import Onboarding from './pages/Onboarding'

export default function App() {
  return (
    <Routes>
      {/* chrome-less genesis flow */}
      <Route path="/onboarding" element={<Onboarding />} />
      {/* app shell */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/movements/:id" element={<MovementDetail />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/exchange" element={<Exchange />} />
        <Route path="/network" element={<Network />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>
    </Routes>
  )
}
