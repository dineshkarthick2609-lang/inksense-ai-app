import React, { useState } from "react";
import "./App.css";
// import Tesseract from "tesseract.js";
import jsPDF from "jspdf";

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [language, setLanguage] = useState("eng");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setText("");
    setNotes([]);
    setSummary("");
  };

  const generateKeyPoints = (inputText) => {
    return inputText
      .split(/[\n.]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 15)
      .slice(0, 5);
  };

  const generateSummary = (inputText) => {
    const lines = inputText
      .split(/[\n.]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 20);

    if (lines.length === 0) {
      return "No detailed summary could be generated from the extracted text.";
    }

    return lines.slice(0, 8).join(". ") + ".";
  };

  const convertText = async () => {
  if (!image) {
    alert("Upload image first");
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("language", language);

    const response = await fetch("https://inksense-backend-v2.onrender.com/ocr", {
  method: "POST",
  body: formData,
});

    const data = await response.json();
    console.log("OCR response:", data);

    if (data.error) {
      alert(data.error);
      setText("No text returned");
      setSummary("No summary returned");
      setNotes([]);
      setLoading(false);
      return;
    }

    setText(data.text && data.text.trim() ? data.text : "No text returned");
    setSummary(
      data.summary && data.summary.trim()
        ? data.summary
        : "No summary returned"
    );
    setNotes(Array.isArray(data.keyPoints) ? data.keyPoints : []);
  } catch (err) {
    console.error("Backend connection failed:", err);
    alert("Backend connection failed");
    setText("Connection failed");
    setSummary("Could not fetch summary");
    setNotes([]);
  }

  setLoading(false);
};

  const downloadPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");

    // PAGE 1 - Original Handwritten Image
    doc.setFontSize(18);
    doc.text("InkSense AI - Original Handwritten Page", 14, 15);

    if (preview) {
      const img = new Image();
      img.src = preview;

      img.onload = () => {
        const pageWidth = 180;
        const pageHeight = 240;

        doc.addImage(img, "JPEG", 15, 25, pageWidth, pageHeight);

        // PAGE 2 - Digital Summary
        doc.addPage();

        doc.setFontSize(18);
        doc.text("InkSense AI - Digital Summary", 14, 15);

        doc.setFontSize(13);
        doc.text("Detailed Summary:", 14, 28);

        doc.setFontSize(11);
        const wrappedSummary = doc.splitTextToSize(
          summary || "No summary available.",
          180
        );
        doc.text(wrappedSummary, 14, 36);

        let y = 36 + wrappedSummary.length * 6 + 8;

        doc.setFontSize(13);
        doc.text("Key Points:", 14, y);
        y += 8;

        doc.setFontSize(11);
        if (notes.length > 0) {
          notes.forEach((point, index) => {
            const wrappedPoint = doc.splitTextToSize(`• ${point}`, 175);
            doc.text(wrappedPoint, 16, y);
            y += wrappedPoint.length * 6 + 3;
          });
        } else {
          doc.text("No key points available.", 16, y);
          y += 10;
        }

        y += 6;
        doc.setFontSize(13);
        doc.text("Extracted Text:", 14, y);
        y += 8;

        doc.setFontSize(10);
        const wrappedText = doc.splitTextToSize(
          text || "No extracted text available.",
          180
        );
        doc.text(wrappedText, 14, y);

        doc.save("InkSense_AI_Output.pdf");
      };
    } else {
      alert("No image available to export.");
    }
  };

  return (
    <div className="app">
      <h1>InkSense AI</h1>
      <p className="subtitle">Handwriting to Digital Intelligence</p>

      <div className="controls">
        <input type="file" accept="image/*" onChange={handleImage} />
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="eng">English</option>
          <option value="tam">Tamil</option>
          <option value="eng+tam">English + Tamil</option>
        </select>
        <button onClick={convertText}>
          {loading ? "Processing..." : "Convert"}
        </button>
        <button onClick={downloadPDF}>Download PDF</button>
      </div>

      <div className="preview-section">
        {preview && <img src={preview} alt="Preview" className="preview" />}
      </div>

      <div className="output-section">
        <h2>Extracted Text</h2>
        <div className="box">{text || "Extracted text will appear here."}</div>

        <h2>Detailed Summary</h2>
        <div className="box">{summary || "Detailed summary will appear here."}</div>

        <h2>Important Key Points</h2>
        <div className="box">
          {notes.length > 0 ? (
            <ul>
              {notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          ) : (
            "Key points will appear here."
          )}
        </div>
      </div>
    </div>
  );
}

export default App;