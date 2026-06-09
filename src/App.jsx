import { useState, useCallback } from "react";

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const records = [];
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const dateCol = cols.find((c) => /^\d{4}\/\d{2}\/\d{2}$|^\d{2}\/\d{2}$/.test(c));
    const amountCol = cols.find((c) => /^[\d,]+$/.test(c) && parseInt(c.replace(/,/g, "")) > 0);
    if (!dateCol || !amountCol) continue;
    const dateIdx = cols.indexOf(dateCol);
    const name = cols[dateIdx + 1] || cols[1] || "不明";
    const amount = parseInt(amountCol.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) continue;
    records.push({ id: `${dateCol}-${name}-${amount}-${Math.random()}`, date: dateCol, name, amount, excluded: false });
  }
  return records;
}

function sumFixed(items) {
  return items.reduce((acc, i) => acc + (parseInt(i.amount) || 0), 0);
}

export default function App() {
  const [tab, setTab] = useState("settings");
  const [husbandRatio, setHusbandRatio] = useState(50);
  const [wifeFixed, setWifeFixed] = useState([{ id: Date.now(), name: "", amount: "" }]);
  const [husbandFixed, setHusbandFixed] = useState([{ id: Date.now() + 1, name: "", amount: "" }]);
  const [csvRecords, setCsvRecords] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const wifeRatio = 100 - husbandRatio;

  const addFixed = (setter) => setter((prev) => [...prev, { id: Date.now(), name: "", amount: "" }]);
  const updateFixed = (setter, id, field, val) => setter((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  const removeFixed = (setter, id) => setter((prev) => prev.filter((i) => i.id !== id));

  const toggleExclude = (id) => {
    setCsvRecords((prev) => prev.map((r) => r.id === id ? { ...r, excluded: !r.excluded } : r));
  };

  const handleCSV = useCallback((file) => {
    if (!file) return;
    setCsvError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const records = parseCSV(text);
      if (records.length === 0) {
        setCsvError("明細が見つかりませんでした。三井住友系CSVか確認してください。");
      } else {
        setCsvRecords(records);
        setTab("result");
      }
    };
    reader.readAsText(file, "Shift_JIS");
  }, []);

  // 対象外を除いた合計
  const activeRecords = csvRecords.filter((r) => !r.excluded);
  const excludedRecords = csvRecords.filter((r) => r.excluded);
  const cardTotal = activeRecords.reduce((a, r) => a + r.amount, 0);
  const husbandCardShare = Math.round(cardTotal * (husbandRatio / 100));
  const wifeCardShare = cardTotal - husbandCardShare;

  const husbandFixedTotal = sumFixed(husbandFixed);
  const wifeFixedTotal = sumFixed(wifeFixed);

  const husbandTotalBurden = Math.round((wifeFixedTotal + husbandFixedTotal) / 2) + husbandCardShare;
  const husbandOwes = husbandTotalBurden - husbandFixedTotal;
  const direction = husbandOwes >= 0 ? "husband-to-wife" : "wife-to-husband";
  const settleAmount = Math.abs(husbandOwes);

  const fmt = (n) => n.toLocaleString("ja-JP");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Noto Sans JP', sans-serif", color: "#e8e6f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)", padding: "20px 24px", backdropFilter: "blur(10px)" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#a78bfa", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>COUPLE FINANCE</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>カード精算アプリ</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {[{ key: "settings", label: "⚙️ 設定" }, { key: "csv", label: "📂 CSV読込" }, { key: "result", label: "💴 精算結果" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "14px 8px",
            background: tab === t.key ? "rgba(167,139,250,0.15)" : "transparent",
            border: "none", borderBottom: tab === t.key ? "2px solid #a78bfa" : "2px solid transparent",
            color: tab === t.key ? "#a78bfa" : "#888", fontSize: 13,
            fontFamily: "'Noto Sans JP', sans-serif", cursor: "pointer",
            fontWeight: tab === t.key ? 700 : 400, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 640, margin: "0 auto" }}>

        {/* ========= SETTINGS ========= */}
        {tab === "settings" && (
          <div>
            <Section title="カード明細の負担割合">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <PersonBadge role="夫" color="#60a5fa" pct={husbandRatio} />
                  <PersonBadge role="妻" color="#f472b6" pct={wifeRatio} />
                </div>
                <input type="range" min={0} max={100} value={husbandRatio}
                  onChange={(e) => setHusbandRatio(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#a78bfa", cursor: "pointer" }} />
                <div style={{ height: 8, borderRadius: 4, marginTop: 8, background: `linear-gradient(to right, #60a5fa ${husbandRatio}%, #f472b6 ${husbandRatio}%)` }} />
              </div>
            </Section>
            <Section title="夫の固定費（毎月）">
              <FixedCostList items={husbandFixed} color="#60a5fa"
                onAdd={() => addFixed(setHusbandFixed)}
                onUpdate={(id, f, v) => updateFixed(setHusbandFixed, id, f, v)}
                onRemove={(id) => removeFixed(setHusbandFixed, id)} />
              <TotalRow total={husbandFixedTotal} color="#60a5fa" />
            </Section>
            <Section title="妻の固定費（毎月）">
              <FixedCostList items={wifeFixed} color="#f472b6"
                onAdd={() => addFixed(setWifeFixed)}
                onUpdate={(id, f, v) => updateFixed(setWifeFixed, id, f, v)}
                onRemove={(id) => removeFixed(setWifeFixed, id)} />
              <TotalRow total={wifeFixedTotal} color="#f472b6" />
            </Section>
            <button onClick={() => setTab("csv")} style={{
              width: "100%", padding: "14px", marginTop: 8,
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              border: "none", borderRadius: 10, color: "white",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
            }}>次へ：CSV読込 →</button>
          </div>
        )}

        {/* ========= CSV ========= */}
        {tab === "csv" && (
          <div>
            <Section title="明細CSVをアップロード">
              <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16, lineHeight: 1.7 }}>
                三井住友カードのMy PageからダウンロードしたCSVをアップロードしてください。
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleCSV(file); }}
                style={{
                  border: `2px dashed ${dragOver ? "#a78bfa" : "rgba(255,255,255,0.2)"}`,
                  borderRadius: 12, padding: "40px 20px", textAlign: "center",
                  background: dragOver ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
                  transition: "all 0.2s", cursor: "pointer",
                }}
                onClick={() => document.getElementById("csv-input").click()}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, color: "#ccc" }}>ここにドラッグ＆ドロップ</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>またはタップしてファイルを選択</div>
                <input id="csv-input" type="file" accept=".csv" style={{ display: "none" }}
                  onChange={(e) => handleCSV(e.target.files[0])} />
              </div>
              {csvError && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#fca5a5" }}>
                  ⚠️ {csvError}
                </div>
              )}
              {csvRecords.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 10, fontWeight: 600 }}>✅ {csvRecords.length}件読み込み済み</div>
                  <button onClick={() => setTab("result")} style={{
                    width: "100%", padding: "14px",
                    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                    border: "none", borderRadius: 10, color: "white",
                    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
                  }}>精算結果を見る →</button>
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ========= RESULT ========= */}
        {tab === "result" && (
          <div>
            {csvRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                <div>先にCSVを読み込んでください</div>
                <button onClick={() => setTab("csv")} style={{
                  marginTop: 16, padding: "10px 24px",
                  background: "rgba(167,139,250,0.2)", border: "1px solid #a78bfa",
                  borderRadius: 8, color: "#a78bfa", cursor: "pointer", fontFamily: "'Noto Sans JP', sans-serif",
                }}>CSV読込へ</button>
              </div>
            ) : (
              <>
                {/* Settlement */}
                <div style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))",
                  border: "1px solid rgba(167,139,250,0.4)",
                  borderRadius: 16, padding: "28px 24px", textAlign: "center", marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, letterSpacing: 3, color: "#a78bfa", marginBottom: 8 }}>今月の精算</div>
                  <div style={{ fontSize: 15, color: "#ccc", marginBottom: 12 }}>{direction === "husband-to-wife" ? "夫 → 妻" : "妻 → 夫"}</div>
                  <div style={{ fontSize: 44, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#fff", letterSpacing: -1 }}>
                    ¥{fmt(settleAmount)}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                    {direction === "husband-to-wife" ? "夫が妻に振り込む金額" : "妻が夫に振り込む金額"}
                  </div>
                </div>

                {/* Breakdown */}
                <Section title="内訳">
                  <Row label={`カード按分対象 合計`} value={`¥${fmt(cardTotal)}`} />
                  {excludedRecords.length > 0 && (
                    <Row label={`対象外 (${excludedRecords.length}件)`} value={`¥${fmt(excludedRecords.reduce((a,r)=>a+r.amount,0))}`} color="#666" />
                  )}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
                  <Row label={`夫の負担分 (${husbandRatio}%)`} value={`¥${fmt(husbandCardShare)}`} color="#60a5fa" />
                  <Row label={`妻の負担分 (${wifeRatio}%)`} value={`¥${fmt(wifeCardShare)}`} color="#f472b6" />
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
                  <Row label="夫の固定費" value={`¥${fmt(husbandFixedTotal)}`} color="#60a5fa" />
                  <Row label="妻の固定費" value={`¥${fmt(wifeFixedTotal)}`} color="#f472b6" />
                  <Row label="固定費折半額（夫負担）" value={`¥${fmt(Math.round((husbandFixedTotal + wifeFixedTotal) / 2))}`} />
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />
                  <div style={{ fontSize: 12, color: "#888", lineHeight: 1.9, padding: "4px 0" }}>
                    夫の総負担 = (固定費合計) ÷ 2 + カード × {husbandRatio}%<br />
                    = ¥{fmt(Math.round((husbandFixedTotal + wifeFixedTotal) / 2))} + ¥{fmt(husbandCardShare)} = ¥{fmt(husbandTotalBurden)}<br />
                    夫→妻 支払額 = ¥{fmt(husbandTotalBurden)} − ¥{fmt(husbandFixedTotal)}（夫固定費）<br />
                    = <span style={{ color: "#a78bfa", fontWeight: 700 }}>¥{fmt(husbandOwes)}</span>
                    {husbandOwes >= 0 ? "（夫→妻）" : "（妻→夫）"}
                  </div>
                </Section>

                {/* 明細テーブル */}
                <Section title={`明細一覧（${csvRecords.length}件 / 対象外 ${excludedRecords.length}件）`}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                    按分対象外にしたい項目の「除外」をタップしてください
                  </div>

                  {/* ヘッダー */}
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px 52px", gap: 4, padding: "6px 8px", fontSize: 11, color: "#666", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <span>日付</span><span>店名</span><span style={{ textAlign: "right" }}>金額</span><span style={{ textAlign: "center" }}>除外</span>
                  </div>

                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {csvRecords.map((r) => (
                      <div key={r.id} style={{
                        display: "grid", gridTemplateColumns: "60px 1fr 90px 52px", gap: 4,
                        padding: "9px 8px", alignItems: "center",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: r.excluded ? "rgba(239,68,68,0.06)" : "transparent",
                        transition: "background 0.15s",
                      }}>
                        <span style={{ fontSize: 11, color: r.excluded ? "#555" : "#777" }}>{r.date}</span>
                        <span style={{
                          fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          color: r.excluded ? "#555" : "#ccc",
                          textDecoration: r.excluded ? "line-through" : "none",
                        }}>{r.name}</span>
                        <span style={{
                          fontSize: 12, textAlign: "right",
                          fontFamily: "'Space Mono', monospace",
                          color: r.excluded ? "#555" : "#e8e6f0",
                          textDecoration: r.excluded ? "line-through" : "none",
                        }}>¥{r.amount.toLocaleString()}</span>
                        <div style={{ textAlign: "center" }}>
                          <button onClick={() => toggleExclude(r.id)} style={{
                            padding: "3px 8px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                            border: r.excluded ? "1px solid #f87171" : "1px solid rgba(255,255,255,0.2)",
                            background: r.excluded ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                            color: r.excluded ? "#f87171" : "#888",
                            fontFamily: "'Noto Sans JP', sans-serif",
                            whiteSpace: "nowrap",
                          }}>
                            {r.excluded ? "戻す" : "除外"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* フッター合計 */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 8px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>按分対象 合計</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>¥{fmt(cardTotal)}</span>
                  </div>
                </Section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#a78bfa", marginBottom: 14, fontWeight: 600 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function PersonBadge({ role, color, pct }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: "4px 16px", background: `${color}22`, border: `1px solid ${color}`, borderRadius: 20, color, fontSize: 13, fontWeight: 700 }}>
        {role} {pct}%
      </div>
    </div>
  );
}

function FixedCostList({ items, color, onAdd, onUpdate, onRemove }) {
  return (
    <div>
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input placeholder="項目名（例：ローン）" value={item.name}
            onChange={(e) => onUpdate(item.id, "name", e.target.value)} style={inputStyle} />
          <input placeholder="金額" type="number" value={item.amount}
            onChange={(e) => onUpdate(item.id, "amount", e.target.value)}
            style={{ ...inputStyle, width: 100, fontFamily: "'Space Mono', monospace" }} />
          <button onClick={() => onRemove(item.id)} style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", borderRadius: 6, padding: "6px 10px", cursor: "pointer", fontSize: 14,
          }}>×</button>
        </div>
      ))}
      <button onClick={onAdd} style={{
        background: "transparent", border: `1px dashed ${color}`, color, borderRadius: 8,
        padding: "7px 16px", cursor: "pointer", fontSize: 12, fontFamily: "'Noto Sans JP', sans-serif",
      }}>＋ 追加</button>
    </div>
  );
}

function TotalRow({ total, color }) {
  if (total === 0) return null;
  return <div style={{ textAlign: "right", marginTop: 8, fontSize: 13, color }}>合計：¥{total.toLocaleString()}</div>;
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: "#aaa" }}>{label}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", color: color || "#e8e6f0" }}>{value}</span>
    </div>
  );
}

const inputStyle = {
  flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "8px 10px", color: "#e8e6f0", fontSize: 13,
  fontFamily: "'Noto Sans JP', sans-serif", outline: "none",
};
