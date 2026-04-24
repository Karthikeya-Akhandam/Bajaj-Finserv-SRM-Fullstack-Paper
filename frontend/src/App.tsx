import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type Hierarchy = {
  root: string;
  tree: Record<string, unknown>;
  depth?: number;
  has_cycle?: true;
};

type ApiResponse = {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
};

const DEFAULT_INPUT =
  "A->B\nA->C\nB->D\nC->E\nE->F\nX->Y\nY->Z\nZ->X\nP->Q\nQ->R\nG->H\nG->H\nG->I\nhello\n1->2\nA->";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

const parseEntries = (source: string) => {
  return source
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const TreeNode = ({ value }: { value: unknown }) => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return null;
  }
  return (
    <ul className="tree-list">
      {entries.map(([node, child]) => (
        <li key={node}>
          <span className="tree-node">{node}</span>
          <TreeNode value={child} />
        </li>
      ))}
    </ul>
  );
};

const stringifyTree = (tree: Record<string, unknown>) => JSON.stringify(tree, null, 2);

export default function App() {
  const [rawInput, setRawInput] = useState(DEFAULT_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const parsedEntries = useMemo(() => parseEntries(rawInput), [rawInput]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResponse(null);
    if (parsedEntries.length === 0) {
      setError("Enter at least one node entry before submitting.");
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = `${apiBaseUrl}/bfhl`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: parsedEntries })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "API request failed.");
        return;
      }
      setResponse(data as ApiResponse);
    } catch (_err) {
      setError("Could not reach API. Verify the backend URL and CORS settings.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="header">
        <h1>SRM BFHL Analyzer</h1>
        <p>Submit node relationships and inspect hierarchies, cycles, and summary metrics.</p>
      </header>

      <section className="panel">
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="entries">Node Entries</label>
          <textarea
            id="entries"
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            rows={12}
            placeholder="A->B, A->C, B->D"
          />
          <div className="form-foot">
            <span>{parsedEntries.length} entries</span>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </section>

      {error ? <section className="error-box">{error}</section> : null}

      {response ? (
        <section className="results">
          <article className="panel identity">
            <h2>Identity</h2>
            <div className="kv-grid">
              <div>
                <strong>user_id</strong>
                <span>{response.user_id}</span>
              </div>
              <div>
                <strong>email_id</strong>
                <span>{response.email_id}</span>
              </div>
              <div>
                <strong>college_roll_number</strong>
                <span>{response.college_roll_number}</span>
              </div>
            </div>
          </article>

          <article className="panel">
            <h2>Summary</h2>
            <div className="summary-grid">
              <div>
                <strong>Total Trees</strong>
                <span>{response.summary.total_trees}</span>
              </div>
              <div>
                <strong>Total Cycles</strong>
                <span>{response.summary.total_cycles}</span>
              </div>
              <div>
                <strong>Largest Tree Root</strong>
                <span>{response.summary.largest_tree_root || "-"}</span>
              </div>
            </div>
          </article>

          <article className="panel">
            <h2>Hierarchies</h2>
            <div className="hierarchies">
              {response.hierarchies.map((hierarchy, index) => (
                <div key={`${hierarchy.root}-${index}`} className="hierarchy-card">
                  <div className="hierarchy-head">
                    <strong>Root: {hierarchy.root}</strong>
                    {hierarchy.has_cycle ? <span className="badge cycle">Cycle</span> : null}
                    {typeof hierarchy.depth === "number" ? (
                      <span className="badge depth">Depth: {hierarchy.depth}</span>
                    ) : null}
                  </div>
                  {hierarchy.has_cycle ? (
                    <p className="muted">Cycle detected. Tree omitted by API contract.</p>
                  ) : (
                    <>
                      <TreeNode value={hierarchy.tree} />
                      <details>
                        <summary>Raw Tree JSON</summary>
                        <pre>{stringifyTree(hierarchy.tree)}</pre>
                      </details>
                    </>
                  )}
                </div>
              ))}
            </div>
          </article>

          <div className="split">
            <article className="panel">
              <h2>Invalid Entries</h2>
              {response.invalid_entries.length > 0 ? (
                <ul className="plain-list">
                  {response.invalid_entries.map((entry, index) => (
                    <li key={`${entry}-${index}`}>{entry || "<empty>"}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None</p>
              )}
            </article>

            <article className="panel">
              <h2>Duplicate Edges</h2>
              {response.duplicate_edges.length > 0 ? (
                <ul className="plain-list">
                  {response.duplicate_edges.map((edge) => (
                    <li key={edge}>{edge}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">None</p>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}
