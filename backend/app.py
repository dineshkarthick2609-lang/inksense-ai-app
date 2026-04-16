from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import pytesseract
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# SET YOUR TESSERACT PATH
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def preprocess_image(file_bytes):
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = np.array(image)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Resize for better OCR
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Light denoise only
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    return gray


def generate_summary(text):
    lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 8]

    summary = " ".join(lines[:6])
    key_points = lines[:5]

    return summary, key_points


@app.route("/ocr", methods=["POST"])
def ocr():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files["image"]
        language = request.form.get("language", "eng")

        file_bytes = image_file.read()
        processed = preprocess_image(file_bytes)

        # Save processed image for debugging
        cv2.imwrite("debug_processed.png", processed)

        config = "--oem 1 --psm 6"
        text = pytesseract.image_to_string(processed, lang=language, config=config)

        summary, key_points = generate_summary(text)

        return jsonify({
            "text": text if text and text.strip() else "No text detected",
            "summary": summary if summary and summary.strip() else "No summary generated",
            "keyPoints": key_points if key_points else []
        })

    except Exception as e:
        print("OCR ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)