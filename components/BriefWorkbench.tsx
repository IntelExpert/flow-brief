"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Newspaper,
  RefreshCcw,
  RotateCw,
  Send,
  ShieldCheck
} from "lucide-react";
import type { ArticleRecord, ContentPackage, DailyBrief } from "@/lib/types";

type PackageListItem = {
  date: string;
  slug: string;
  title: string;
  sourceName: string;
  url: string;
  path: string;
};

export function BriefWorkbench() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [selected, setSelected] = useState<ArticleRecord | null>(null);
  const [contentPackage, setContentPackage] = useState<ContentPackage | null>(null);
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    void loadBrief();
    void loadPackages();
  }, []);

  async function loadBrief(force = false) {
    setError(null);
    const response = await fetch(`/api/brief${force ? "?force=1" : ""}`);
    if (!response.ok) {
      setError(`Brief failed with HTTP ${response.status}`);
      return;
    }
    const nextBrief = (await response.json()) as DailyBrief;
    setBrief(nextBrief);
    setSelected((current) => current ?? nextBrief.shortlist[0] ?? null);
  }

  async function loadPackages() {
    const response = await fetch("/api/packages");
    if (!response.ok) return;
    const data = (await response.json()) as { packages: PackageListItem[] };
    setPackages(data.packages);
  }

  async function generatePackage() {
    if (!selected) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article: selected })
      });
      if (!response.ok) {
        setError(`Generation failed with HTTP ${response.status}`);
        return;
      }
      const nextPackage = (await response.json()) as ContentPackage;
      setContentPackage(nextPackage);
      await loadPackages();
    } finally {
      setIsGenerating(false);
    }
  }

  function refresh() {
    startTransition(() => {
      void loadBrief(true);
    });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Daily water industry desk</div>
          <h1>Flow Brief</h1>
        </div>
        <div className="topbarActions">
          <StatusBadge icon={<CalendarDays size={16} />} label={brief?.runDate ?? "No brief"} />
          <button className="iconButton" onClick={refresh} aria-label="Refresh daily brief" title="Refresh daily brief" disabled={isPending}>
            {isPending ? <Loader2 className="spin" size={18} /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </header>

      {error ? (
        <div className="notice critical">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="workspace">
        <aside className="queuePanel" aria-label="Article shortlist">
          <div className="panelHeader">
            <Newspaper size={18} />
            <span>Shortlist</span>
          </div>
          <div className="queueList">
            {brief?.shortlist.map((article, index) => (
              <button
                key={article.id}
                className={`articleRow ${selected?.id === article.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(article);
                  setContentPackage(null);
                }}
              >
                <span className="rank">{index + 1}</span>
                <span className="articleRowText">
                  <strong>{article.title}</strong>
                  <small>
                    {article.sourceName} · {article.relevanceScore}
                  </small>
                </span>
              </button>
            ))}
            {!brief ? (
              <div className="loadingBlock">
                <Loader2 className="spin" size={18} />
                <span>Loading brief</span>
              </div>
            ) : null}
          </div>
          {brief?.warnings.length ? (
            <div className="warningList">
              {brief.warnings.slice(0, 3).map((warning) => (
                <div key={warning} className="warningItem">
                  <AlertTriangle size={14} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>

        <section className="articlePanel" aria-label="Selected article">
          {selected ? (
            <>
              <div className="articleHeader">
                <div>
                  <div className="sourceLine">
                    <span>{selected.sourceName}</span>
                    {selected.publishedAt ? <span>{new Date(selected.publishedAt).toLocaleDateString()}</span> : null}
                  </div>
                  <h2>{selected.title}</h2>
                </div>
                <a className="iconButton" href={selected.url} target="_blank" rel="noreferrer" aria-label="Open source article" title="Open source article">
                  <ExternalLink size={18} />
                </a>
              </div>

              <div className="scoreStrip">
                <div>
                  <span className="scoreLabel">Relevance</span>
                  <strong>{selected.relevanceScore}</strong>
                </div>
                <div className="scoreTrack">
                  <span style={{ width: `${Math.min(100, selected.relevanceScore)}%` }} />
                </div>
              </div>

              <p className="excerpt">{selected.excerpt}</p>

              <div className="reasonGrid">
                {selected.relevanceReasons.slice(0, 6).map((reason) => (
                  <div className="reasonCard" key={`${reason.label}-${reason.score}`}>
                    <div className="reasonTop">
                      <span>{reason.label}</span>
                      <strong>{reason.score > 0 ? `+${reason.score}` : reason.score}</strong>
                    </div>
                    <p>{reason.evidence.join(", ")}</p>
                  </div>
                ))}
              </div>

              <div className="mediaBand">
                <div className="panelHeader">
                  <ImageIcon size={17} />
                  <span>Image candidates</span>
                </div>
                <div className="imageRail">
                  {selected.imageCandidates.length ? (
                    selected.imageCandidates.slice(0, 4).map((image) => (
                      <img key={image.url} src={image.url} alt={image.alt ?? "Article image candidate"} loading="lazy" />
                    ))
                  ) : (
                    <span className="muted">No source images found. The package will create an original image brief.</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="emptyState">
              <Archive size={28} />
              <span>No article selected</span>
            </div>
          )}
        </section>

        <aside className="packagePanel" aria-label="Generated package">
          <div className="panelHeader">
            <FileText size={18} />
            <span>Package</span>
          </div>

          <button className="primaryButton" disabled={!selected || isGenerating} onClick={generatePackage}>
            {isGenerating ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
            <span>{isGenerating ? "Building" : "Build package"}</span>
          </button>

          {contentPackage ? (
            <div className="packageSummary">
              <div className="completeLine">
                <CheckCircle2 size={18} />
                <span>Written to output</span>
              </div>
              <code>{contentPackage.packagePath}</code>
              <div className="qualityLine">
                <ShieldCheck size={17} />
                <span>{contentPackage.quality.flags.length} quality flags</span>
              </div>
              <div className="fileList">
                {contentPackage.files.map((file) => (
                  <code key={file}>{file.split("/").slice(-1)[0]}</code>
                ))}
              </div>
            </div>
          ) : (
            <div className="emptyPackage">
              <RotateCw size={18} />
              <span>Select an article and build the local output set.</span>
            </div>
          )}

          <div className="archiveList">
            <div className="panelHeader compact">
              <Archive size={16} />
              <span>Recent</span>
            </div>
            {packages.slice(0, 5).map((item) => (
              <a className="archiveItem" href={item.url} target="_blank" rel="noreferrer" key={`${item.date}-${item.slug}`}>
                <span>{item.title}</span>
                <small>
                  {item.date} · {item.sourceName}
                </small>
              </a>
            ))}
            {!packages.length ? <span className="muted">No completed packages yet.</span> : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatusBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="statusBadge">
      {icon}
      <span>{label}</span>
    </div>
  );
}
