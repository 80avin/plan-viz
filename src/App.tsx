import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { planRaw1, sample1 } from "./lib/planViz";
import { TreeView } from "./components/TreeView";
import lzString from "lz-string";
import ThemeSelect from "./components/ThemeSelect";

function updateUrl(doc) {
  doc = {
    title: document.title,
    ...doc,
  };
  const url = new URL(window.location.href);
  url.searchParams.set(
    "q",
    lzString.compressToEncodedURIComponent(JSON.stringify(doc)),
  );
  window.history.pushState(undefined, "", url);
}

function App() {
  const [text, _setText] = useState(planRaw1);
  const [code, _output] = sample1(text);
  const debounceRef = useRef<number | null>(null);
  const setText = useCallback((t: string) => {
    _setText(t);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateUrl({
        text: t,
      });
      debounceRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const qString = url.searchParams.get("q");
    if (!qString) return;
    let decodedStr = undefined;
    let isLZString = false;
    try {
      decodedStr = lzString.decompressFromEncodedURIComponent(qString);
      isLZString = true;
    } catch (err) {
      decodedStr = qString;
    }
    if (!qString) {
      url.searchParams.delete("q");
      window.location.href = url.toString();
      return;
    }
    try {
      let doc = JSON.parse(decodedStr);
      if (Array.isArray(doc)) {
        doc = {
          title: doc[0],
          text: doc[1],
        };
        isLZString = false;
      }
      if (doc.text) {
        _setText(doc.text);
      }
      if (doc.title) {
        document.title = doc.title;
      }
      if (!isLZString) {
        updateUrl(doc);
      }
    } catch (err) {}
  }, []);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "stretch",
          width: "100%",
        }}
      >
        <div className="w100pct-on-focus">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <ThemeSelect />
            <code>{document.title}</code>
            <textarea
              style={{ whiteSpace: "pre" }}
              rows={100}
              value={text}
              onChange={(e) => setText(e.target.value)}
            ></textarea>
          </div>
        </div>
        <div style={{ width: "100%" }}>
          <TreeView data={_output} />
        </div>
      </div>
    </>
  );
}

export default App;
