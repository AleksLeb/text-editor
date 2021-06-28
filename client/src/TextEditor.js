import Quill from "quill";
import { useCallback, useEffect, useState } from "react";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

const TOOLBAR_OPTIONS_PC = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"]
];

const TOOLBAR_OPTIONS_MOBILE = [
  [{ header: [1, 3, false] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"]
];

export default function TextEditor() {
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const { id: documentId } = useParams();
  const [change, setChange] = useState(false);
  const [option, setOption] = useState(TOOLBAR_OPTIONS_PC);

  useEffect(() => {
    if (window.innerWidth > 700) setOption(TOOLBAR_OPTIONS_PC);
    else setOption(TOOLBAR_OPTIONS_MOBILE);
    const debounce = (func, wait, immediate) => {
      var timeout;
      return () => {
        const context = this,
          args = arguments;
        const later = function () {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    };
    window.addEventListener(
      "resize",
      debounce(
        () => {
          if (window.innerWidth > 700) setOption(TOOLBAR_OPTIONS_PC);
          else setOption(TOOLBAR_OPTIONS_MOBILE);
        },
        200,
        false
      ),
      false
    );
  }, []);

  useEffect(() => {
    // INCOMING MONGODB DOCUMENT
    if (socket == null || quill == null) return;
    socket.once("load-document", document => {
      quill.setContents(document);
      quill.enable();
    });
    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // AUTOSAVE OFF
  const SAVE_INTERVAL = 20000;
  useEffect(() => {
    if (socket == null || quill == null) return;
    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  useEffect(() => {
    // TEXT-CHANGE - ME
    if (socket == null || quill == null) return;
    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
      setChange(true);
    };
    quill.on("text-change", handler);
    return () => {
      quill.off("text-changes", handler);
    };
  }, [socket, quill]);

  useEffect(() => {
    // TEXT-CHANGE - OTHERS
    if (socket == null || quill == null) return;
    const handler = delta => {
      quill.updateContents(delta);
      setChange(true);
    };
    socket.on("receive-changes", handler);
    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  useEffect(() => {
    const link =
      process.env.NODE_ENV === "development"
        ? "http://localhost:5000"
        : "https://text-editor-online.herokuapp.com/";
    const s = io(link);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const wrapperRef = useCallback(
    wrapper => {
      if (wrapper === null) return;
      wrapper.innerHTML = "";
      const editor = document.createElement("div");
      wrapper.append(editor);
      const q = new Quill(editor, {
        theme: "snow",
        modules: {
          toolbar: option
        }
      });
      q.disable();
      q.setText("Loading...");
      setQuill(q);
    },
    [option]
  );

  return (
    <div>
      {option.length < 4 && (
        <button
          style={{ width: "100%", padding: "10px" }}
        >
          Save
        </button>
      )}
      <div
        className="container"
        ref={wrapperRef}
        style={{
          "--base": `${change ? "red" : "green"}`
        }}
      ></div>
    </div>
  );
}
