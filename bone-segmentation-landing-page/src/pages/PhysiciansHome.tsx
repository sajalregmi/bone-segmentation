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

const PhysiciansHome: FC = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [imageIds, setImageIds] = useState<string[]>([]);

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

  const handleScanClick = async (scan: Scan) => {
    try {
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
    // In real implementation, handle the form data, 
    // call your upload endpoint, etc.
  };

  return (
    <div className="physician-home-container">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <h2>Latest Scans</h2>
        <ul>
          {scans.map((scan) => (
            <li key={scan.segmentation_id}>
              {/* Use <details> to allow expansion on click */}
              <details onClick={() => handleScanClick(scan)}>
                <summary>
                  Patient: {scan.patient_email} – {scan.created_at}
                </summary>
                <p>Threshold Range: [{scan.lower_threshold}, {scan.upper_threshold}]</p>
              </details>
            </li>
          ))}
        </ul>

        <h3>Upload New Scan</h3>
        <form onSubmit={handleScanUpload} className="upload-form">
          <div className="form-group custom-file-input">
            <label htmlFor="folder">Select Folder</label>
            <input type="file" id="folder" name="folder" required />
          </div>
          <div className="form-group">
            <label htmlFor="patientEmail">Patient Email</label>
            <input type="email" id="patientEmail" name="patientEmail" required />
          </div>
          <button type="submit">Upload</button>
        </form>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <h2>CT SCAN VIEWER</h2>
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
