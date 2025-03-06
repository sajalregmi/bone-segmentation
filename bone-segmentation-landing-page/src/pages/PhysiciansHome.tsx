// src/pages/PhysiciansHome.tsx
import React, { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


import './css/PhysiciansHome.css';
import Cornerstone3DStackViewer from '../components/CornerstoneViewer';

interface Scan {
  segmentation_id: number;
  patient_email: string;
  output_folder_path: string;
  created_at: string;
  upper_threshold: number;
  lower_threshold: number;
}

// The JSON returned by GET /get-scans/ is { segmentations: Scan[] }
const PhysiciansHome: FC = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [imageIds, setImageIds] = useState<string[]>([]);

  // 1. Load scans on component mount
  useEffect(() => {
    const getScans = async () => {
      try {
        const res = await fetch('http://localhost:8000/get-scans/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        if (!res.ok) {
          console.error('Failed to fetch scans');
          if (res.status === 401) {
            alert('Session Expired please login to continue...');
            navigate('/');
          }
          return;
        }

        const data = await res.json();
        setScans(data.segmentations);
      } catch (error) {
        console.error('Error fetching scans:', error);
      }
    };
    getScans();
  }, [navigate]);

  // 2. On click of a scan
  const handleScanClick = async (scan: Scan) => {
    try {
      // Fetch list of .dcm from /get-dicom-files/<seg_id>
      const url = `http://localhost:8000/get-dicom-files/${scan.segmentation_id}/`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        console.error('Failed to fetch DICOM files');
        return;
      }
      const data = await res.json();


      const dicomFilenames: string[] = data.dicom_files;


      const constructedImageIds = dicomFilenames.map((filename) => {
        return `wadouri:http://localhost:8000/dicoms/${scan.segmentation_id}/${filename}/`;
      });
      


      setImageIds(constructedImageIds);
    } catch (error) {
      console.error('Error fetching DICOM file list:', error);
    }
  };

  const handleScanUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Scan uploaded (dummy handler)');
  };

  return (
    <div className="physician-home-container">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <h2>Latest Scans</h2>
        <ul>
          {scans.map((scan) => (
            <li
              key={scan.segmentation_id}
              onClick={() => handleScanClick(scan)}
              style={{ cursor: 'pointer', marginBottom: '10px' }}
            >
              <p>
                <strong>Patient:</strong> {scan.patient_email}
              </p>
              <p>{scan.created_at}</p>
              <p>
                Threshold: [{scan.lower_threshold}, {scan.upper_threshold}]
              </p>
            </li>
          ))}
        </ul>

        <h3>Upload New Scan</h3>
        <form onSubmit={handleScanUpload}>
          <div>
            <label htmlFor="folder">Folder:</label>
            <input type="file" id="folder" name="folder" required />
          </div>
          <div>
            <label htmlFor="patientEmail">Patient Email:</label>
            <input type="email" id="patientEmail" name="patientEmail" required />
          </div>
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <h2>Selected Scan Viewer (Cornerstone3D Stack)</h2>
        {imageIds.length > 0 ? (
          <Cornerstone3DStackViewer imageIds={imageIds} />
        ) : (
          <p>Please select a scan from the left panel.</p>
        )}
      </div>
    </div>
  );
};

export default PhysiciansHome;
