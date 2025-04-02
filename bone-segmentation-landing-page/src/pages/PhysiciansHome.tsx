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

  const [resegmentThresholds, setResegmentThresholds] = useState<{
    lower: string;
    upper: string;
    segmentationId: number | null;
  }>({ lower: '', upper: '', segmentationId: null });

  const [folderPath, setFolderPath] = useState<string>('');
  const [lowerThreshold, setLowerThreshold] = useState<string>('');
  const [upperThreshold, setUpperThreshold] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');

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

  const handleScanUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // Build request body
      const requestBody = {
        folder_path: folderPath,
        lower_threshold: lowerThreshold,
        upper_threshold: upperThreshold,
        patient_email: patientEmail,
      };

      const res = await fetch('http://127.0.0.1:8000/segment-images/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        console.error('Failed to segment images');
        alert('Segmentation failed. Please check logs/server.');
        return;
      }

      const data = await res.json();
      alert(`Segmentation completed successfully! New segmentation ID: ${data.segmentation_id}`);
      const updatedScansRes = await fetch('http://127.0.0.1:8000/get-scans/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      if (updatedScansRes.ok) {
        const updatedScansData = await updatedScansRes.json();
        setScans(updatedScansData.segmentations);
      }

    } catch (error) {
      console.error('Error uploading/segmenting scan:', error);
      alert('Error during segmentation request.');
    }
  };


  const handleResegmentClick = (scan: Scan) => {
    const newLower = prompt('Enter new LOWER threshold', String(scan.lower_threshold));
    const newUpper = prompt('Enter new UPPER threshold', String(scan.upper_threshold));

    if (newLower && newUpper) {
      setResegmentThresholds({
        lower: newLower,
        upper: newUpper,
        segmentationId: scan.segmentation_id
      });
    }
  };

  useEffect(() => {
    const doResegment = async () => {
      if (!resegmentThresholds.segmentationId) return; 
      try {
        const segId = resegmentThresholds.segmentationId;
        const requestBody = {
          lower_threshold: resegmentThresholds.lower,
          upper_threshold: resegmentThresholds.upper
        };
        const res = await fetch(`http://127.0.0.1:8000/resegment-images/${segId}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          console.error('Failed to re-segment images');
          alert('Re-segmentation failed.');
          return;
        }
        const data = await res.json();
        alert(`Re-segmentation completed. New segmentation ID: ${data.new_segmentation_id}`);
        setResegmentThresholds({ lower: '', upper: '', segmentationId: null });
        const updatedScansRes = await fetch('http://127.0.0.1:8000/get-scans/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        if (updatedScansRes.ok) {
          const updatedScansData = await updatedScansRes.json();
          setScans(updatedScansData.segmentations);
        }

      } catch (error) {
        console.error('Error re-segmenting:', error);
      }
    };
    if (resegmentThresholds.segmentationId) {
      doResegment();
    }
  }, [resegmentThresholds]);

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
  return (
    <div className="physician-home-container">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <h2>Latest Scans</h2>
        <ul>
          {scans.map((scan) => (
            <li key={scan.segmentation_id}>
              <details onClick={() => handleScanClick(scan)}>
                <summary>
                  Patient: {scan.patient_email} – {scan.created_at}
                </summary>
                <p>
                  Threshold Range: [{scan.lower_threshold}, {scan.upper_threshold}]
                </p>
              </details>
              {/* Button to re-segment this scan */}
              <button onClick={() => handleResegmentClick(scan)}>
                Re-segment
              </button>
            </li>
          ))}
        </ul>

        <h3>Upload New Scan</h3>
        <form onSubmit={handleScanUpload} className="upload-form">
          <div className="form-group">
            <label htmlFor="folder">Folder Path</label>
            <input
              type="text"
              id="folderPath"
              name="folderPath"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="lowerThreshold">Lower Threshold</label>
            <input
              type="number"
              id="lowerThreshold"
              name="lowerThreshold"
              value={lowerThreshold}
              onChange={(e) => setLowerThreshold(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="upperThreshold">Upper Threshold</label>
            <input
              type="number"
              id="upperThreshold"
              name="upperThreshold"
              value={upperThreshold}
              onChange={(e) => setUpperThreshold(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="patientEmail">Patient Email</label>
            <input
              type="email"
              id="patientEmail"
              name="patientEmail"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit">Segment</button>
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
