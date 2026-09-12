import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import Home from "@/pages/Home";
import EcgLab from "@/pages/EcgLab";
import SignalConditioningLab from "@/pages/SignalConditioningLab";
import WirelessLab from "@/pages/WirelessLab";
import NetworkSimulator from "@/pages/NetworkSimulator";
import PowerSimulator from "@/pages/PowerSimulator";
import PulseOxLab from "@/pages/PulseOxLab";
import CgmLab from "@/pages/CgmLab";
import StudentProjectMode from "@/pages/StudentProjectMode";
import CustomDesign from "@/pages/CustomDesign";
import DesignChallenges from "@/pages/DesignChallenges";
import InstructorMode from "@/pages/InstructorMode";
import Assessment from "@/pages/Assessment";
import { Placeholder } from "@/pages/Placeholder";

const PLACEHOLDERS = [
  { path: "/tools/packet-inspector", title: "Packet Inspector", desc: "Decode simulated telemetry frames byte-by-byte — headers, payload, checksums and encoding.", phase: "a later phase" },
];

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lab/ecg" element={<EcgLab />} />
          <Route path="/lab/pulse-ox" element={<PulseOxLab />} />
          <Route path="/lab/cgm" element={<CgmLab />} />
          <Route path="/projects" element={<StudentProjectMode />} />
          <Route path="/projects/design/:labId" element={<CustomDesign />} />
          <Route path="/challenges" element={<DesignChallenges />} />
          <Route path="/instructor" element={<InstructorMode />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/tools/signal-conditioning" element={<SignalConditioningLab />} />
          <Route path="/tools/wireless-comparison" element={<WirelessLab />} />
          <Route path="/tools/network-simulator" element={<NetworkSimulator />} />
          <Route path="/tools/power-simulator" element={<PowerSimulator />} />
          {PLACEHOLDERS.map((p) => (
            <Route
              key={p.path}
              path={p.path}
              element={<Placeholder title={p.title} description={p.desc} phase={p.phase} />}
            />
          ))}
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
