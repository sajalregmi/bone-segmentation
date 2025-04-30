  
# Bone Segmentation & 3D Reconstruction Software

**Sponsored by: Johnson & Johnson Medtech**  
**In Collaboration with: Arizona State University, School of Biological and Health Systems Engineering**  
**Capstone Project for BME Degree**

---

## 🚀 Overview

This modular, cloud-based platform performs **3D segmentation** and **surface reconstruction** of bones from CT images. It is built to balance **clinical accuracy**, **scalability**, and **accessibility**—enabling medical professionals to upload scans, visualize reconstructions, and export STL files for 3D printing or surgical planning.

---

## 🏗️ Architecture

### 1. Data Server (Django & Python)
- **Authentication & Authorization**: Secure user management with AES-128 encryption & HIPAA-compliant storage  
- **File Management**: Upload/download CT DICOMs, session tracking, database (PostgreSQL) integration  
- **API Endpoints**: RESTful interfaces for frontend & segmentation server communication

### 2. Segmentation Server (Python)
- **Dual‐Algorithm Segmentation**  
  - **Threshold‐Based Preprocessing**: Narrow Hounsfield unit ranges to isolate bone tissue  
  - **CNN Refinement**: Deep learning model for pixel‐wise bone classification  
- **3D Reconstruction**:  
  - **Marching Cubes** for iso-surface extraction  
  - Export to **STL** format  

### 3. Client Application (React & Three.js)
- **Real‐Time 3D Rendering**: Pan, orbit, zoom, smoothing filters  
- **Anatomical Measurements Overlay**  
- **STL Download** for 3D printing or clinical review  

---

## 🧠 Algorithms & Techniques

- **Threshold-Based Segmentation**: Adaptive thresholding to generate coarse bone masks  
- **Neural Network Segmentation**: Convolutional model for high-fidelity boundary detection  
- **Marching Cubes**: Iso-surface extraction to convert segmented volumes into polygonal meshes  
- **Image Processing**: Morphological operations, smoothing, and artifact removal  

---

## 🛠️ Getting Started

### Prerequisites
- **Python 3.8+**, **Node.js 14+**, **npm**  
- Docker & Docker Compose (optional)  

---

### 1. Frontend (React)
```bash
cd bone-segmentation-landing-page
npm install
npm start
```

### 2. Backend (Django)
```bash
cd bone-segmentation-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd boneServer
python manage.py migrate
python manage.py runserver
```

---


## ⚖️ License

This project is released under the **MIT License**.

---

**Thank you to Johnson & Johnson Medtech and ASU SBHSE for their support!**  
