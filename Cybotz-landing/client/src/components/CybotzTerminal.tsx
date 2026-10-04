import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Maximize2, Minimize2, Trash2, CornerDownLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface TerminalLine {
  id: string;
  type?: "system" | "command" | "output" | "success" | "error" | "warning" | "info" | "banner";
  text: string;
}

const FILES: Record<string, string> = {
  "mission.txt": `[CYBOTZ CORE DIRECTIVE]
1. 100% Practical engineering — no black-box play kits.
2. Zero copy-paste AI prompt shortcuts.
3. Train real thinkers who understand physics, math & logic from first principles.
Location: Bangalore, India`,

  "drone_config.json": `{
  "firmware": "CybotzFlight-v2.4",
  "mcu": "STM32F405 @ 168MHz",
  "radio_protocol": "CRSF / ELRS 2.4GHz",
  "esc_protocol": "DSHOT600 (4x 45A)",
  "motor_kv": 2450,
  "battery_cells": "4S 1500mAh LiPo",
  "pids": { "roll_p": 45, "pitch_p": 48, "yaw_p": 35 }
}`,

  "sensors.log": `[SENSOR INITIALIZATION MATRIX]
IMU  : MPU6000 (6-axis gyro/accel) -> CALIBRATED [0.00, 0.00, 0.00]
BARO : BMP280 (I2C 0x76)           -> 924.3 hPa (Alt: 920m ASL)
MAG  : QMC5883L (Magnetometer)     -> HEADING: 184° [LOCKED]
GPS  : UBLOX M8N (UART3 115200bps) -> 18 SATELLITES (3D FIX)`,

  "pinout.md": `# STM32F405 Flight Controller Pinout
- PA0-PA3 : PWM Output (Motors M1-M4)
- PB6/PB7 : I2C1 (Barometer + Compass)
- PC10/11 : UART3 (GPS Module)
- PA9/PA10: UART1 (Telemetry / Radio RX)
- PC4     : Battery Voltage ADC (11:1 Divider)`,

  "firmware.hex": `:10000000000400200901000815010008170100087F
:1000100000000000000000000000000000000000E0
:100020002B0100082F01000800000000330100083B
[Binary size: 32.4 KB | Target: STM32F405 Core | SHA256: 4f8a...e91c]`
};

const AVAILABLE_COMMANDS = [
  "help",
  "compile",
  "telemetry",
  "status",
  "arm",
  "disarm",
  "sensors",
  "motors",
  "ls",
  "cat",
  "ping",
  "scan",
  "whoami",
  "date",
  "uname",
  "workshops",
  "labs",
  "book",
  "history",
  "clear",
  "reboot"
];

const INITIAL_BOOT_SEQUENCE = [
  "Initializing Cybotz Bootloader v1.0.3 (ARM Cortex-M4)...",
  "[OK] Loading kernel modules from flash memory...",
  "[OK] Calibrating 6-axis gyroscope sensors...",
  "[OK] Testing 915MHz RF telemetry link...",
  "[READY] System armed. Type 'help' or 'compile' to begin."
];

export default function CybotzTerminal() {
  const [, setLocation] = useLocation();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isArmed, setIsArmed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Play boot sequence on mount
  useEffect(() => {
    runBootSequence();
  }, []);

  // Auto-scroll internal terminal container on new lines
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [lines]);

  const runBootSequence = () => {
    setLines([]);
    INITIAL_BOOT_SEQUENCE.forEach((text, i) => {
      setTimeout(() => {
        setLines(prev => [
          ...prev,
          {
            id: `boot-${Date.now()}-${i}`,
            type: text.startsWith("[OK]") ? "success" : text.startsWith("[READY]") ? "info" : "system",
            text
          }
        ]);
      }, i * 400);
    });
  };

  const addLine = (text: string, type: TerminalLine["type"] = "output") => {
    setLines(prev => [...prev, { id: `line-${Date.now()}-${Math.random()}`, text, type }]);
  };

  const handleCommandExecution = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Save to history
    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Print command invocation
    addLine(`cybotz@stem-lab:~$ ${trimmed}`, "command");

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "help":
      case "?":
        addLine(
          `CYBOTZ SHELL — Available Commands:
  • System     : help, status, telemetry, whoami, date, uname, history, clear, reboot
  • Hardware   : compile, arm, disarm, sensors, motors
  • Filesystem : ls, cat <filename>, pwd
  • Network    : ping <host>, scan
  • Navigation : workshops, labs, book, contact
Tip: Use ↑/↓ for command history, [Tab] for autocomplete.`,
          "info"
        );
        break;

      case "compile":
      case "make":
      case "build":
        addLine("[1/4] CC src/flight_ctrl.c (ARM GCC 12.3.1)...", "system");
        addLine("[2/4] CC src/kalman_filter.c -> FPU instructions linked", "system");
        addLine("[3/4] LD build/firmware.elf (Flash: 32.4KB / SRAM: 8.2KB)", "system");
        addLine(">>> Flash verified: STM32F405 @ 168MHz. Firmware ready for deployment!", "success");
        break;

      case "telemetry":
      case "top":
        addLine(
          `[TELEMETRY LINK: 915MHz LoRa | RSSI: -42dBm | LQ: 100%]
  • BATTERY : 15.8V (4S LiPo - 94%) | Current: 1.2A
  • ATTITUDE: Roll: 0.02° | Pitch: -0.15° | Yaw: 184.2°
  • THERMAL : Core: 38.4°C | ESC: 41.2°C
  • ALTITUDE: Baro: +12.4m ASL | Vario: 0.0 m/s
  • GPS FIX : 12.9716° N, 77.5946° E (Bangalore) | 18 Sats`,
          "output"
        );
        break;

      case "status":
        addLine(
          `SYSTEM HEALTH MATRIX:
  [OK] IMU 6-AXIS       : CALIBRATED (MPU6000)
  [OK] BAROMETER        : ONLINE (BMP280)
  [OK] ESC CONTROLLERS  : DSHOT600 READY (4x ESC)
  [OK] RF TELEMETRY     : LOCKED (CRSF 250Hz)
  [!]  SAFETY STATUS    : ${isArmed ? "ARMED (THROTTLE LIVE)" : "STANDBY (DISARMED)"}`,
          isArmed ? "warning" : "success"
        );
        break;

      case "arm":
      case "arm-drone":
        setIsArmed(true);
        addLine("CAUTION: MOTORS ARMED! Propeller idle RPM active (1050 RPM). Keep clear of blades.", "warning");
        break;

      case "disarm":
        setIsArmed(false);
        addLine("Motors DISARMED. Safety interlock engaged. Safe for inspection.", "success");
        break;

      case "sensors":
        addLine(
          `CONNECTED HARDWARE BUS (I2C1 / SPI1 / UART):
  • MPU-6000   : Accel [X: 0.01g, Y: -0.02g, Z: 1.00g] Gyro [0, 0, 0 dps]
  • BMP-280    : Pressure: 924.3 hPa | Ambient Temp: 26.8°C
  • QMC-5883L  : Magnetometer Heading: 184° South-South-West
  • INA-226    : Voltage: 15.82V | Load: 1.24A | Power: 19.6W`,
          "output"
        );
        break;

      case "motors":
      case "motor-test":
        addLine("Running ESC spin-test sequence (100ms per motor)...", "system");
        addLine("  [M1 Front-Right (CCW)] : OK -> 1200 RPM", "output");
        addLine("  [M2 Rear-Right  (CW)]  : OK -> 1200 RPM", "output");
        addLine("  [M3 Rear-Left   (CCW)] : OK -> 1200 RPM", "output");
        addLine("  [M4 Front-Left  (CW)]  : OK -> 1200 RPM", "output");
        addLine("All 4 motor channels verified normal.", "success");
        break;

      case "ls":
      case "dir":
        addLine(Object.keys(FILES).join("    "), "output");
        break;

      case "cat":
        if (!args[0]) {
          addLine("Usage: cat <filename> (e.g. cat mission.txt, cat drone_config.json)", "error");
        } else {
          const filename = args[0];
          if (FILES[filename]) {
            addLine(FILES[filename], "output");
          } else {
            addLine(`cat: ${filename}: No such file. Try 'ls' to see available files.`, "error");
          }
        }
        break;

      case "pwd":
        addLine("/home/cybotz/stem-lab", "output");
        break;

      case "ping":
        const target = args[0] || "bangalore.lab";
        addLine(`PING ${target} (10.0.4.12): 56 data bytes`, "system");
        addLine(`64 bytes from 10.0.4.12: icmp_seq=1 ttl=64 time=0.42 ms`, "output");
        addLine(`64 bytes from 10.0.4.12: icmp_seq=2 ttl=64 time=0.38 ms`, "output");
        addLine(`--- ${target} ping statistics --- 2 packets transmitted, 0% packet loss`, "success");
        break;

      case "scan":
        addLine("Scanning 5.8GHz FPV Video Bands [A, B, E, F, R]...", "system");
        addLine("  CH-R1 (5658MHz) : [░░░░░░░░] -92dBm (FREE)", "output");
        addLine("  CH-R4 (5769MHz) : [████████] -35dBm (CYBOTZ FPV BEACON ACTIVE)", "info");
        addLine("  CH-R8 (5917MHz) : [░░░░░░░░] -94dBm (FREE)", "output");
        break;

      case "whoami":
        addLine("cadet@cybotz-aerospace-lab (Bangalore, India)", "info");
        break;

      case "date":
      case "time":
        addLine(new Date().toString(), "output");
        break;

      case "uname":
        addLine("CybotzOS 2.4.0-stm32f4 armv7m GNU/Linux (Aerospace STEM Edition)", "output");
        break;

      case "history":
        if (history.length === 0) {
          addLine("No previous commands in history.", "output");
        } else {
          history.forEach((h, idx) => addLine(`  ${idx + 1}  ${h}`, "output"));
        }
        break;

      case "echo":
        addLine(args.join(" "), "output");
        break;

      case "workshops":
        addLine("Navigating to Cybotz Drone & Robotics Workshops page...", "info");
        setLocation("/workshops");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;

      case "labs":
        addLine("Navigating to Cybotz STEM Labs Ecosystem page...", "info");
        setLocation("/labs");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;

      case "book":
      case "contact":
        addLine("Opening consultation booking calendar...", "info");
        const contactSec = document.getElementById("sec-contact");
        if (contactSec) {
          contactSec.scrollIntoView({ behavior: "smooth" });
        }
        break;

      case "clear":
      case "cls":
        setLines([]);
        break;

      case "reboot":
      case "restart":
        runBootSequence();
        break;

      default:
        addLine(
          `Command not recognized: '${cmd}'. Type 'help' for available commands or try 'compile', 'telemetry', 'ls'.`,
          "error"
        );
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleCommandExecution(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Command History UP
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInput(history[nextIdx] || "");
    }
    // Command History DOWN
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx] || "");
      }
    }
    // Tab Autocomplete
    else if (e.key === "Tab") {
      e.preventDefault();
      const current = input.trim();
      if (!current) return;

      // Check if typing a command or a filename
      if (current.startsWith("cat ")) {
        const filePrefix = current.slice(4).toLowerCase();
        const matchedFile = Object.keys(FILES).find(f => f.toLowerCase().startsWith(filePrefix));
        if (matchedFile) {
          setInput(`cat ${matchedFile}`);
        }
      } else {
        const matchedCmd = AVAILABLE_COMMANDS.find(c => c.startsWith(current.toLowerCase()));
        if (matchedCmd) {
          setInput(matchedCmd);
        }
      }
    }
    // Ctrl+L to Clear
    else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    handleCommandExecution(cmd);
    if (inputRef.current) inputRef.current.focus();
  };

  const getLineColorClass = (type?: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "text-cyan-300 font-semibold";
      case "success":
        return "text-emerald-400 font-medium";
      case "error":
        return "text-rose-400";
      case "warning":
        return "text-amber-400 font-medium";
      case "info":
        return "text-cyan-400";
      case "system":
        return "text-emerald-500/90";
      default:
        return "text-emerald-400";
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-[#030712] overflow-hidden font-mono shadow-2xl transition-all duration-300">
      {/* Terminal Window Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        {/* macOS Style Traffic Dots */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block shadow-[0_0_6px_rgba(255,95,86,0.5)]" />
          <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block shadow-[0_0_6px_rgba(255,189,46,0.5)]" />
          <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block shadow-[0_0_6px_rgba(39,201,63,0.5)]" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <TerminalIcon size={13} className="text-cyan-400" />
          <span className="text-xs text-gray-300 font-bold tracking-wider">cybotz-shell.sh (tty1)</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-gray-400">
          <button
            type="button"
            onClick={() => setLines([])}
            title="Clear Terminal (Ctrl+L)"
            className="p-1 rounded hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize Window" : "Expand Window"}
            className="p-1 rounded hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-gray-500 text-[10px] uppercase font-bold shrink-0 mr-1 flex items-center gap-1">
          <Sparkles size={10} className="text-cyan-400" /> Quick:
        </span>
        {[
          { label: "help", cmd: "help" },
          { label: "compile", cmd: "compile" },
          { label: "telemetry", cmd: "telemetry" },
          { label: isArmed ? "disarm" : "arm", cmd: isArmed ? "disarm" : "arm" },
          { label: "ls", cmd: "ls" },
          { label: "cat mission.txt", cmd: "cat mission.txt" },
          { label: "ping", cmd: "ping bangalore.lab" },
          { label: "clear", cmd: "clear" }
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickCommand(item.cmd)}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer shrink-0 text-[10px]"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalBodyRef}
        onClick={() => inputRef.current?.focus()}
        className={`p-4 ${isExpanded ? "h-80" : "h-56"} overflow-y-auto text-xs flex flex-col gap-1.5 cursor-text bg-[#030712] selection:bg-emerald-500/30 selection:text-white transition-all duration-300`}
      >
        {lines.map(line => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap leading-relaxed ${getLineColorClass(line.type)}`}
          >
            {line.text}
          </div>
        ))}

        {/* Active Command Prompt */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-auto pt-1">
          <span className="text-cyan-400 font-bold shrink-0">cybotz@stem-lab:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type 'help', 'compile', or click a quick chip..."
            className="bg-transparent border-none outline-none text-emerald-300 flex-grow focus:ring-0 p-0 text-xs font-mono placeholder:text-gray-600 caret-emerald-400"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            className="text-gray-600 hover:text-cyan-400 transition-colors px-1 cursor-pointer"
            title="Execute Command (Enter)"
          >
            <CornerDownLeft size={12} />
          </button>
        </form>
      </div>
    </div>
  );
}
