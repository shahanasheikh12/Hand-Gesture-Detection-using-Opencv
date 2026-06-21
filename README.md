# AeroTrack - Hand Gesture Detection Dashboard

An interactive, high-performance hand tracking and gesture detection application. This project features two modes of operation: a **modern web-based localhost dashboard** (utilizing MediaPipe Web SDK with customizable glowing skeleton presets and particles) and a **native desktop OpenCV script**.

---

## ✨ Features

- **Double-Engine Support**: Run as a rich browser-based dashboard or a native Python desktop app.
- **Client-Side Processing**: Real-time hand tracking running entirely in the browser with minimal CPU overhead.
- **Custom Visual Presets**:
  - **Neon Skeleton (Classic)**: Vibrant glowing joints and connection lines.
  - **Cyberpunk Pulse (Particles)**: Spawns glowing interactive particles that emit from fingertips.
  - **Minimal**: Displays joints without skeleton lines for a clean interface.
  - **Hologram HUD**: Adds crosshairs and coordinates next to fingertips for a futuristic display.
- **Real-Time Gesture Recognition**: Identifies gestures like **Fist ✊**, **Open Hand ✋**, **Victory/Peace ✌️**, **Thumbs Up 👍**, and **Spider-Man 🤘**.
- **Live Telemetry**: Moniters tracking frame rates (FPS) and model processing latency (ms).
- **Webcam Feed Control**: Toggle the background camera video feed on/off or mirror the feed instantly.

---

## 🛠️ Built With

- **Frontend**: HTML5, Vanilla CSS, Modern JavaScript
- **Backend / Scripting**: Python 3
- **Computer Vision Frameworks**: OpenCV-Python & MediaPipe (Web/Python SDKs)
- **Design Elements**: Lucide Icons & Google Fonts (Outfit / Space Grotesk)

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have Python installed on your system. 

### ⚙️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shahanasheikh12/Hand-Gesture-Detection-using-Opencv.git
   cd Hand-Gesture-Detection-using-Opencv
   ```

2. **Install Python dependencies** (only required for running the desktop version):
   ```bash
   pip install -r requirements.txt
   ```

---

## 💻 Running the Project

You can start the project in either of the two following modes:

### Option A: Web-Based Interactive Dashboard (Recommended)
This mode serves a modern dashboard on `localhost`. All computing models run client-side.
1. Start the local server:
   ```bash
   python server.py
   ```
2. Your default web browser will automatically open to **`http://localhost:8000`**.
3. Allow camera access, make sure you are connected to the internet (to load the tracking models from CDN), and interact!

### Option B: Native Desktop Window
This runs the original Python script using OpenCV.
1. Run the Python application:
   ```bash
   python app.py
   ```
2. A separate camera output window will open on your desktop. Press **`q`** to quit.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn and build. Any contributions you make are **greatly appreciated**!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ✉️ Contact

**Shahanasheikh12** - [shahanasheikh787@gmail.com](mailto:shahanasheikh787@gmail.com)

Project Link: [https://github.com/shahanasheikh12/Hand-Gesture-Detection-using-Opencv](https://github.com/shahanasheikh12/Hand-Gesture-Detection-using-Opencv)
