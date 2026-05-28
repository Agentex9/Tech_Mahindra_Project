import { useEffect, useMemo, useState } from "react";

import { useToast } from "../components/toast-provider";
import { updateStoredUser } from "../lib/auth";
import { spinRoulette } from "../lib/api";
import { useDashboardContext } from "../lib/dashboard";

type RouletteSlot = {
  color: "green" | "red" | "black";
  label: string;
  multiplier: number;
  value: number;
};

type BetOption = "red" | "black" | "green" | "even" | "odd" | "low" | "high";

type RouletteHistoryItem = {
  amount: number;
  balanceAfter: number;
  multiplier: number;
  option: BetOption;
  payout: number;
  result: number;
  timestamp: string;
  won: boolean;
};

const ROULETTE_STORAGE_KEY = "worktrack.roulette.history";

const WHEEL: RouletteSlot[] = [
  { color: "green", label: "0", multiplier: 14, value: 0 },
  { color: "red", label: "1", multiplier: 2, value: 1 },
  { color: "black", label: "2", multiplier: 2, value: 2 },
  { color: "red", label: "3", multiplier: 2, value: 3 },
  { color: "black", label: "4", multiplier: 2, value: 4 },
  { color: "red", label: "5", multiplier: 2, value: 5 },
  { color: "black", label: "6", multiplier: 2, value: 6 },
  { color: "red", label: "7", multiplier: 2, value: 7 },
  { color: "black", label: "8", multiplier: 2, value: 8 },
  { color: "red", label: "9", multiplier: 2, value: 9 },
  { color: "black", label: "10", multiplier: 2, value: 10 },
  { color: "red", label: "11", multiplier: 2, value: 11 },
  { color: "black", label: "12", multiplier: 2, value: 12 },
];

const BET_OPTIONS: Array<{ description: string; label: string; value: BetOption }> = [
  { description: "Paga x2", label: "Rojo", value: "red" },
  { description: "Paga x2", label: "Negro", value: "black" },
  { description: "Paga x14", label: "Verde 0", value: "green" },
  { description: "Paga x2", label: "Par", value: "even" },
  { description: "Paga x2", label: "Impar", value: "odd" },
  { description: "Paga x2", label: "1 a 6", value: "low" },
  { description: "Paga x2", label: "7 a 12", value: "high" },
];

function loadHistory() {
  if (typeof window === "undefined") {
    return [] as RouletteHistoryItem[];
  }

  try {
    const raw = window.localStorage.getItem(ROULETTE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RouletteHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(history: RouletteHistoryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROULETTE_STORAGE_KEY, JSON.stringify(history.slice(0, 12)));
}

function isWinningBet(option: BetOption, slot: RouletteSlot) {
  switch (option) {
    case "red":
      return slot.color === "red";
    case "black":
      return slot.color === "black";
    case "green":
      return slot.color === "green";
    case "even":
      return slot.value !== 0 && slot.value % 2 === 0;
    case "odd":
      return slot.value % 2 === 1;
    case "low":
      return slot.value >= 1 && slot.value <= 6;
    case "high":
      return slot.value >= 7 && slot.value <= 12;
  }
}

function getMultiplier(option: BetOption) {
  return option === "green" ? 14 : 2;
}

export function meta() {
  return [
    { title: "WorkTrack | Ruleta" },
    { name: "description", content: "Ruleta de casino en frontend." },
  ];
}

export default function RoulettePage() {
  const toast = useToast();
  const { token, updateUser, user } = useDashboardContext();
  const [selectedOption, setSelectedOption] = useState<BetOption>("red");
  const [betAmount, setBetAmount] = useState("10");
  const [history, setHistory] = useState<RouletteHistoryItem[]>([]);
  const [currentSlot, setCurrentSlot] = useState<RouletteSlot>(WHEEL[0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<RouletteHistoryItem | null>(null);
  const selectedOptionConfig = BET_OPTIONS.find((option) => option.value === selectedOption) ?? BET_OPTIONS[0];
  const normalizedBetAmount = Number(betAmount);
  const potentialPayout = Number.isFinite(normalizedBetAmount) && normalizedBetAmount > 0
    ? normalizedBetAmount * getMultiplier(selectedOption)
    : 0;

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const recentWinRate = useMemo(() => {
    if (history.length === 0) {
      return 0;
    }

    return Math.round((history.filter((item) => item.won).length / history.length) * 100);
  }, [history]);

  function applyBalance(nextBalance: number) {
    const nextUser = updateStoredUser({ points_balance: nextBalance });
    if (nextUser) {
      updateUser(nextUser);
    }
  }

  async function handleSpin() {
    const amount = Number(betAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Escribe una apuesta valida.");
      return;
    }

    if (amount > user.points_balance) {
      toast.error("No tienes puntos suficientes para esa apuesta.");
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);

    for (let index = 0; index < 18; index += 1) {
      const slot = WHEEL[Math.floor(Math.random() * WHEEL.length)];
      window.setTimeout(() => setCurrentSlot(slot), index * 70);
    }

    try {
      const response = await spinRoulette(token, { amount, option: selectedOption });
      const finalSlot = WHEEL.find((slot) => slot.value === response.result) ?? WHEEL[0];

      const entry: RouletteHistoryItem = {
        amount: response.amount,
        balanceAfter: response.balance_after,
        multiplier: response.multiplier,
        option: selectedOption,
        payout: response.payout,
        result: response.result,
        timestamp: response.created_at ?? new Date().toISOString(),
        won: response.won,
      };

      window.setTimeout(() => {
        setCurrentSlot(finalSlot);
        setSpinResult(entry);
        setHistory((current) => {
          const next = [entry, ...current].slice(0, 12);
          persistHistory(next);
          return next;
        });
        applyBalance(response.balance_after);
        toast[response.won ? "success" : "error"](
          response.won ? `Ganaste ${response.payout} pts.` : `Perdiste ${response.amount} pts.`,
        );
        setIsSpinning(false);
      }, 18 * 70 + 120);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible girar la ruleta.";
      toast.error(message);
      setIsSpinning(false);
    }
  }

  return (
    <section className="dashboard-content roulette-page">
      <section className="hero-banner compact roulette-hero">
        <div>
          <span className="hero-kicker">Ruleta</span>
          <h1>Ruleta de casino con logica en backend.</h1>
          <p className="subtle-copy">La apuesta descuenta y paga puntos directamente sobre tu balance en el servidor.</p>
        </div>
        <div className="hero-actions roulette-hero-actions">
          <div className="simple-badge">{user.points_balance} pts</div>
          <span className="status-pill roulette-hero-pill">{selectedOptionConfig.label}</span>
        </div>
      </section>

      <section className="roulette-summary-grid">
        <article className="roulette-summary-card roulette-summary-card-accent">
          <span className="simple-label">Balance actual</span>
          <strong>{user.points_balance} pts</strong>
          <p className="muted-copy">Disponible para apostar ahora mismo.</p>
        </article>
        <article className="roulette-summary-card">
          <span className="simple-label">Apuesta seleccionada</span>
          <strong>{selectedOptionConfig.label}</strong>
          <p className="muted-copy">{selectedOptionConfig.description}</p>
        </article>
        <article className="roulette-summary-card">
          <span className="simple-label">Pago potencial</span>
          <strong>{potentialPayout > 0 ? `${potentialPayout} pts` : "—"}</strong>
          <p className="muted-copy">Calculado sobre el monto actual.</p>
        </article>
      </section>

      <section className="roulette-layout">
        <article className="simple-panel roulette-board-panel">
          <div className="roulette-panel-head">
            <div>
              <h2>Mesa</h2>
              <p className="muted-copy">El resultado final se confirma desde backend.</p>
            </div>
            <span className={`status-pill roulette-color-pill roulette-color-pill-${currentSlot.color}`}>
              Casilla {currentSlot.label}
            </span>
          </div>
          <div className="roulette-wheel-shell">
            <div className={`roulette-wheel roulette-${currentSlot.color}`}>
              <span>{currentSlot.label}</span>
            </div>
            <div className="roulette-ticker" aria-hidden="true" />
          </div>
          <div className="roulette-strip">
            {WHEEL.map((slot) => (
              <div className={`roulette-cell roulette-cell-${slot.color}`} key={slot.value}>
                {slot.label}
              </div>
            ))}
          </div>
          {spinResult ? (
            <div className={`status roulette-result-banner ${spinResult.won ? "success" : "error"}`}>
              <strong>{spinResult.won ? "Ganaste" : "No cayó tu apuesta"}</strong>
              <span>
                Resultado {spinResult.result} · {spinResult.won ? `Pago ${spinResult.payout} pts.` : `Perdiste ${spinResult.amount} pts.`}
              </span>
            </div>
          ) : (
            <div className="roulette-result-placeholder">
              <span className="muted-copy">Haz un giro para ver aquí el resultado de la ronda.</span>
            </div>
          )}
        </article>

        <article className="simple-panel roulette-bet-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Apuesta</h2>
              <p className="muted-copy">Selecciona la opcion y define el monto.</p>
            </div>
          </div>
          <div className="roulette-selection-card">
            <div>
              <span className="simple-label">Seleccion actual</span>
              <strong>{selectedOptionConfig.label}</strong>
            </div>
            <div className="roulette-selection-meta">
              <span>{selectedOptionConfig.description}</span>
              <span>x{getMultiplier(selectedOption)}</span>
            </div>
          </div>
          <div className="roulette-options">
            {BET_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={selectedOption === option.value ? "bet-option is-active" : "bet-option"}
                disabled={isSpinning}
                onClick={() => setSelectedOption(option.value)}
                type="button"
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>Monto</span>
            <input
              disabled={isSpinning}
              min="1"
              step="1"
              type="number"
              value={betAmount}
              onChange={(event) => setBetAmount(event.target.value)}
            />
          </label>
          <div className="confirm-actions">
            <button className="primary-button" disabled={isSpinning} onClick={handleSpin} type="button">
              {isSpinning ? "Girando..." : "Girar ruleta"}
            </button>
          </div>
          <dl className="project-facts project-facts-single roulette-facts-grid">
            <div>
              <dt>Balance actual</dt>
              <dd>{user.points_balance} pts</dd>
            </div>
            <div>
              <dt>Win rate reciente</dt>
              <dd>{recentWinRate}%</dd>
            </div>
            <div>
              <dt>Pago de la apuesta</dt>
              <dd>x{getMultiplier(selectedOption)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="simple-panel">
        <div className="panel-header panel-header-start">
          <div>
            <h2>Historial reciente</h2>
            <p className="muted-copy">Ultimos 12 giros guardados localmente.</p>
          </div>
        </div>
        <div className="module-list">
          {history.map((entry) => (
            <article className="module-item" key={entry.timestamp}>
              <div className="module-item-head">
                <strong>{entry.option.toUpperCase()} · Resultado {entry.result}</strong>
                <span className={entry.won ? "status-pill status-completed" : "status-pill status-cancelled"}>
                  {entry.won ? "Ganada" : "Perdida"}
                </span>
              </div>
              <div className="module-item-meta">
                <span>Apuesta: {entry.amount} pts</span>
                <span>Pago: {entry.payout} pts</span>
                <span>Balance: {entry.balanceAfter} pts</span>
              </div>
            </article>
          ))}
          {history.length === 0 ? <p className="muted-copy">Todavia no hay giros registrados.</p> : null}
        </div>
      </section>
    </section>
  );
}
