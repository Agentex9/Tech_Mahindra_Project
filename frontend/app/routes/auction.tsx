import { useEffect, useMemo, useState } from "react";
import { Modal } from "../components/modal";
import { ListControls, paginate } from "../components/list-controls";
import { useToast } from "../components/toast-provider";
import { isPrivilegedUser, updateStoredUser } from "../lib/auth";
import {
  createIssueAuction,
  createIssueBid,
  fetchIssueAuctions,
  fetchIssueBids,
  fetchIssues,
  fetchMe,
  updateIssueAuction,
  type Issue,
  type IssueAuction,
  type IssueAuctionPayload,
  type IssueBid,
} from "../lib/api";
import { useDashboardContext } from "../lib/dashboard";

import { formatShortSpanishDateTime } from "../lib/date";

type AuctionCardData = {
  auction: IssueAuction | null;
  bids: IssueBid[];
  issue: Issue;
  topBid: IssueBid | null;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function nowLocal(): string {
  return toDateTimeLocal(new Date().toISOString());
}

function nowPlusMinutes(minutes: number): string {
  return toDateTimeLocal(new Date(Date.now() + minutes * 60000).toISOString());
}

export function meta() {
  return [
    { title: "WorkTrack | Subasta" },
    { name: "description", content: "Bidding de issues." },
  ];
}

export default function AuctionPage() {
  const toast = useToast();
  const { token, updateUser, user } = useDashboardContext();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [auctions, setAuctions] = useState<IssueAuction[]>([]);
  const [bidsByAuction, setBidsByAuction] = useState<Record<string, IssueBid[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [selectedCard, setSelectedCard] = useState<AuctionCardData | null>(null);
  const [createIssueId, setCreateIssueId] = useState("");
  const [createStart, setCreateStart] = useState(nowLocal);
  const [createEnd, setCreateEnd] = useState(() => nowPlusMinutes(15));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  async function loadAuctionData() {
    setIsLoading(true);
    try {
      const [issuesPayload, auctionsPayload, profilePayload] = await Promise.all([
        fetchIssues(token),
        fetchIssueAuctions(token),
        fetchMe(token),
      ]);
      const bidsEntries = await Promise.all(
        auctionsPayload.map(async (auction) => [auction.auction_id, await fetchIssueBids(token, auction.auction_id)] as const),
      );

      setIssues(issuesPayload);
      setAuctions(auctionsPayload);
      setBidsByAuction(Object.fromEntries(bidsEntries));
      const nextUser = updateStoredUser(profilePayload);
      if (nextUser) {
        updateUser(nextUser);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cargar las subastas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAuctionData();

    const interval = window.setInterval(() => {
      void loadAuctionData();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [token]);

  const biddingCards = useMemo<AuctionCardData[]>(() => {
    return issues
      .filter((issue) => issue.assignment_type === "Bidding" && issue.status !== "Completed")
      .map((issue) => {
        const auction = auctions.find((item) => item.issue === issue.issue_id) ?? null;
        const bids = auction ? bidsByAuction[auction.auction_id] ?? [] : [];
        const sortedBids = [...bids].sort((left, right) => Number(right.bid_amount) - Number(left.bid_amount));

        return {
          auction,
          bids: sortedBids,
          issue,
          topBid: sortedBids[0] ?? null,
        };
      })
      .filter((card) => card.auction === null || card.auction.status !== "Completed");
  }, [auctions, bidsByAuction, issues]);

  const filteredBiddingCards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return biddingCards;
    }
    return biddingCards.filter((card) =>
      [card.issue.title, card.issue.description, card.issue.priority, card.issue.issue_type, card.auction?.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [biddingCards, search]);

  const paginatedBiddingCards = useMemo(() => paginate(filteredBiddingCards, page, pageSize), [filteredBiddingCards, page, pageSize]);

  useEffect(() => {
    if (paginatedBiddingCards.page !== page) {
      setPage(paginatedBiddingCards.page);
    }
  }, [page, paginatedBiddingCards.page]);

  const bidEligibleIssues = useMemo(() => {
    const issueIdsInAuction = new Set(auctions.map((auction) => auction.issue));
    return issues.filter(
      (issue) =>
        issue.assignment_type === "Bidding" &&
        issue.status !== "Completed" &&
        !issueIdsInAuction.has(issue.issue_id),
    );
  }, [auctions, issues]);

  async function handleCreateAuction() {
    if (!createIssueId || !createStart || !createEnd) {
      toast.error("Completa issue, inicio y fin.");
      return;
    }

    const durationMs = new Date(createEnd).getTime() - new Date(createStart).getTime();
    if (durationMs < 60000) {
      toast.error("La subasta debe durar al menos 1 minuto.");
      return;
    }

    setIsSaving(true);
    try {
      await createIssueAuction(token, {
        end_date: new Date(createEnd).toISOString(),
        issue: createIssueId,
        start_date: new Date(createStart).toISOString(),
        status: "In Progress",
        winner: null,
      });
      toast.success("Subasta creada.");
      setCreateIssueId("");
      setCreateStart(nowLocal());
      setCreateEnd(nowPlusMinutes(15));
      await loadAuctionData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear la subasta.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickStartAuction(issueId: string) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    setIsSaving(true);
    try {
      await createIssueAuction(token, {
        end_date: endDate.toISOString(),
        issue: issueId,
        start_date: startDate.toISOString(),
        status: "In Progress",
        winner: null,
      });
      toast.success("Subasta iniciada.");
      await loadAuctionData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible iniciar la subasta.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBidSubmit() {
    if (!selectedCard?.auction) {
      toast.error("Este issue aún no tiene una subasta activa.");
      return;
    }

    if (selectedCard.auction.status === "Completed") {
      toast.error("Esta subasta ya está cerrada.");
      setSelectedCard(null);
      return;
    }

    const topBid = selectedCard.topBid;
    const nextAmount = Number(bidAmount);

    if (!Number.isFinite(nextAmount) || nextAmount <= 0 || !Number.isInteger(nextAmount)) {
      toast.error("Escribe una oferta válida en puntos enteros.");
      return;
    }

    if (topBid && nextAmount < Number(topBid.bid_amount)) {
      toast.error("La nueva oferta no puede ser menor a la más alta actual.");
      return;
    }

    setIsSaving(true);
    try {
      await createIssueBid(token, {
        auction: selectedCard.auction.auction_id,
        bid_amount: bidAmount,
        bidder: user.id,
      });
      toast.success("Oferta registrada.");
      setBidAmount("");
      setSelectedCard(null);
      await loadAuctionData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar la oferta.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCloseAuction(card: AuctionCardData) {
    if (!card.auction) {
      return;
    }

    const payload: IssueAuctionPayload = {
      end_date: card.auction.end_date,
      issue: card.auction.issue,
      start_date: card.auction.start_date,
      status: "Completed",
      winner: card.topBid?.bidder ?? null,
    };

    setIsSaving(true);
    try {
      await updateIssueAuction(token, card.auction.auction_id, payload);
      toast.success("Subasta cerrada.");
      await loadAuctionData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible cerrar la subasta.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="dashboard-content auction-page">
      <section className="hero-banner compact">
        <div>
          <span className="hero-kicker">Subasta</span>
          <h1>Issues en bidding y sus ofertas activas.</h1>
          <p className="subtle-copy">Revisa las oportunidades abiertas, ofertas actuales y pendientes de apertura.</p>
        </div>
      </section>

      {isPrivilegedUser(user) ? (
        <section className="simple-panel auction-create-panel">
          <div className="panel-header panel-header-start">
            <div>
              <h2>Nueva subasta</h2>
              <p className="muted-copy">Crea manualmente una subasta para cualquier issue marcado como bidding.</p>
            </div>
          </div>
          <div className="form-grid form-grid-3 auction-create-grid">
            <label className="field">
              <span>Issue</span>
              <select value={createIssueId} onChange={(event) => setCreateIssueId(event.target.value)}>
                <option value="">Selecciona uno</option>
                {bidEligibleIssues.map((issue) => (
                  <option key={issue.issue_id} value={issue.issue_id}>
                    {issue.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Inicio</span>
              <input type="datetime-local" value={createStart} onChange={(event) => setCreateStart(event.target.value)} />
            </label>
            <label className="field">
              <span>Fin</span>
              <input type="datetime-local" value={createEnd} onChange={(event) => setCreateEnd(event.target.value)} />
            </label>
          </div>
          <div className="confirm-actions auction-create-actions">
            <button className="primary-button" disabled={isSaving} onClick={handleCreateAuction} type="button">
              {isSaving ? "Creando..." : "Crear subasta"}
            </button>
          </div>
        </section>
      ) : null}

      {!isLoading ? (
        <section className="simple-panel">
          <ListControls
            end={paginatedBiddingCards.end}
            label="issues en bidding"
            page={paginatedBiddingCards.page}
            pageSize={pageSize}
            search={search}
            searchPlaceholder="Buscar por issue, prioridad, tipo o estado"
            start={paginatedBiddingCards.start}
            total={filteredBiddingCards.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSearchChange={setSearch}
          />
        </section>
      ) : null}

      <section className="cards-grid issues-grid auction-cards-grid">
        {isLoading ? <div className="status muted auction-status">Cargando issues en bidding...</div> : null}
        {!isLoading && filteredBiddingCards.length === 0 ? (
          <div className="empty-state-card auction-empty-state">
            <h3>Sin issues en bidding</h3>
            <p>No hay issues con asignación por subasta en este momento.</p>
          </div>
        ) : null}
        {paginatedBiddingCards.items.map((card) => (
          <article className="portfolio-card issue-card" key={card.issue.issue_id}>
            <div className="portfolio-card-top">
              <span className={`status-pill status-${card.issue.status.toLowerCase().replaceAll(" ", "-")}`}>{card.issue.status}</span>
              <span className="muted-inline">{card.auction ? `${card.bids.length} ofertas` : "Pendiente de subasta"}</span>
            </div>
            <div className="portfolio-card-body">
              <h3>{card.issue.title}</h3>
              <p>{card.issue.description || "Sin descripción."}</p>
            </div>
            <dl className="project-facts project-facts-single">
              <div>
                <dt>Mayor oferta</dt>
                <dd>{card.topBid ? card.topBid.bid_amount : "Sin ofertas"}</dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{card.auction ? formatShortSpanishDateTime(card.auction.start_date) : "No iniciada"}</dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd>{card.auction ? formatShortSpanishDateTime(card.auction.end_date) : "No definida"}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>{card.issue.priority || "Sin definir"}</dd>
              </div>
            </dl>
            <div className="portfolio-card-actions">
              {card.auction && card.auction.status !== "Completed" ? (
                <button className="primary-button" onClick={() => setSelectedCard(card)} type="button">
                  Ofertar
                </button>
              ) : card.auction?.status === "Completed" ? (
                <button className="secondary-button" disabled type="button">
                  Subasta cerrada
                </button>
              ) : isPrivilegedUser(user) ? (
                <button className="primary-button" disabled={isSaving} onClick={() => void handleQuickStartAuction(card.issue.issue_id)} type="button">
                  Iniciar subasta
                </button>
              ) : (
                <button className="secondary-button" disabled type="button">
                  Esperando apertura
                </button>
              )}
              {card.auction && isPrivilegedUser(user) ? (
                <button className="secondary-button" disabled={isSaving} onClick={() => void handleCloseAuction(card)} type="button">
                  Cerrar subasta
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {selectedCard ? (
        <Modal onClose={() => !isSaving && setSelectedCard(null)} title="Registrar oferta">
          <div className="stack-form">
            <div>
              <strong>{selectedCard.issue.title}</strong>
              <p className="muted-copy">
                Inicio: {selectedCard.auction ? formatShortSpanishDateTime(selectedCard.auction.start_date) : "No iniciada"} ·
                Fin: {selectedCard.auction ? formatShortSpanishDateTime(selectedCard.auction.end_date) : "No definida"}
              </p>
            </div>
            <p>
              Oferta más alta actual: <strong>{selectedCard.topBid?.bid_amount ?? "Sin ofertas"}</strong>
            </p>
            <label className="field">
              <span>Monto</span>
              <input min="0" step="1" type="number" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} />
            </label>
            <div className="confirm-actions">
              <button className="secondary-button" onClick={() => setSelectedCard(null)} type="button">
                Cancelar
              </button>
              <button className="primary-button" disabled={isSaving} onClick={handleBidSubmit} type="button">
                {isSaving ? "Registrando..." : "Confirmar oferta"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
