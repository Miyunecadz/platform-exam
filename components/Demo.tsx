"use client";

import { useMemo, useState } from "react";
import { validate, describeForm, describeIndexes } from "@/lib/validation";
import type { Definition } from "@/lib/validation";

import defA from "@/definitions/client-a-city-maintenance.json";
import defB from "@/definitions/client-b-grant-foundation.json";
import defC from "@/definitions/client-c-clinic-referrals.json";
import recA from "@/sample-records/client-a-records.json";
import recB from "@/sample-records/client-b-records.json";
import recC from "@/sample-records/client-c-records.json";

type Client = { key: string; name: string; def: Definition; records: any[] };

const CLIENTS: Client[] = [
  { key: "a", name: "Client A — City maintenance", def: defA as Definition, records: recA as any[] },
  { key: "b", name: "Client B — Grant foundation", def: defB as Definition, records: recB as any[] },
  { key: "c", name: "Client C — Clinic referrals", def: defC as Definition, records: recC as any[] },
];

export default function Demo() {
  const [clientKey, setClientKey] = useState("a");
  const [recordIndex, setRecordIndex] = useState(0);
  const [view, setView] = useState<"validate" | "form" | "indexes">("validate");

  const client = CLIENTS.find((c) => c.key === clientKey)!;
  const [text, setText] = useState(() =>
    JSON.stringify(client.records[0], null, 2),
  );

  function loadRecord(ck: string, idx: number) {
    const c = CLIENTS.find((x) => x.key === ck)!;
    const rec = c.records[idx] ?? c.records[0];
    setClientKey(ck);
    setRecordIndex(idx);
    setText(JSON.stringify(rec, null, 2));
  }

  const result = useMemo(() => {
    let record: any;
    try {
      record = JSON.parse(text);
    } catch {
      return { parseError: "Record is not valid JSON." as const };
    }
    return { result: validate(client.def, record) };
  }, [text, client.def]);

  const form = useMemo(() => describeForm(client.def), [client.def]);
  const indexes = useMemo(() => describeIndexes(client.def), [client.def]);

  return (
    <div className="demo">
      <div className="demo-controls">
        <select
          value={clientKey}
          onChange={(e) => loadRecord(e.target.value, 0)}
          aria-label="Client"
        >
          {CLIENTS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={recordIndex}
          onChange={(e) => loadRecord(clientKey, Number(e.target.value))}
          aria-label="Sample record"
        >
          {client.records.map((r, i) => (
            <option key={i} value={i}>
              Record {i + 1}
              {r._note ? ` — ${r._note}` : ""}
            </option>
          ))}
        </select>
        <span className="seg">
          <button
            aria-pressed={view === "validate"}
            onClick={() => setView("validate")}
          >
            Validate
          </button>
          <button
            aria-pressed={view === "form"}
            onClick={() => setView("form")}
          >
            Form description
          </button>
          <button
            aria-pressed={view === "indexes"}
            onClick={() => setView("indexes")}
          >
            Indexes
          </button>
        </span>
      </div>

      <div className="grid">
        <div>
          <label style={{ fontSize: 13, color: "var(--muted)" }}>
            Submitted record (editable)
          </label>
          <textarea
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="out">
          {view === "validate" &&
            ("parseError" in result ? (
              <span className="result-bad">{result.parseError}</span>
            ) : (
              <ValidateOutput result={result.result} />
            ))}
          {view === "form" && <pre>{JSON.stringify(form.fields, null, 2)}</pre>}
          {view === "indexes" && (
            <pre>{JSON.stringify(indexes.indexes, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ValidateOutput({
  result,
}: {
  result: ReturnType<typeof validate>;
}) {
  return (
    <div>
      <p className={result.valid ? "result-ok" : "result-bad"}>
        {result.valid
          ? "✓ valid"
          : `✗ ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`}
      </p>
      {result.errors.map((e, i) => (
        <div className="err-row" key={i}>
          <span className="err-code">{e.code}</span>
          <span>
            <strong>{e.field}</strong> — {e.message}
          </span>
        </div>
      ))}
      {result.warnings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {result.warnings.map((w, i) => (
            <div className="warn-row" key={i}>
              ⚠ {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
