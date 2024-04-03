import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { PlanViz, planRaw1, sample1 } from "./lib/planViz";
import { TreeView } from "./components/TreeView";
import lzString from "lz-string";

function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState(planRaw1);
  const [code, _output] = sample1(text);
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
        setText(doc.text);
      }
      if (doc.title) {
        document.title = doc.title;
      }
      if (!isLZString) {
        url.searchParams.set(
          "q",
          lzString.compressToEncodedURIComponent(JSON.stringify(doc)),
        );
        window.location.href = url.toString();
      }
    } catch (err) {}
  }, []);
  // const output = JSON.stringify(_output, undefined, 2);
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
          <textarea
            style={{ whiteSpace: "pre" }}
            rows={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
        </div>
        {/* <textarea */}
        {/*   style={{ width: "100%" }} */}
        {/*   rows={100} */}
        {/*   value={output} */}
        {/* ></textarea> */}
        <div style={{ width: "100%" }}>
          <TreeView data={_output} />
        </div>
      </div>
    </>
  );
}

export default App;
