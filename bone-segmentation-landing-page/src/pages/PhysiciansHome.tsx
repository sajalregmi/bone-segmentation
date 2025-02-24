import React, { FC } from 'react';
import './css/PhysiciansHome.css';

interface Scan {
  id: number;
  name: string;
  date: string;
}

const PhysiciansHome: FC = () => {
  // Dummy data for latest scans
  const scans: Scan[] = [
    { id: 1, name: 'Scan 1', date: '2025-02-01' },
    { id: 2, name: 'Scan 2', date: '2025-02-15' },
    { id: 3, name: 'Scan 3', date: '2025-03-01' },
  ];

  const handleScanUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Here you would handle uploading the new scan.
    // You can access the form values via form elements or use refs.
    alert('Scan uploaded (dummy handler)');
  };

  return (
    <div className="physician-home-container">
      <div className="left-panel">
        <h2>Latest Scans</h2>
        <ul>
          {scans.map((scan) => (
            <li key={scan.id}>
              {scan.name} - {scan.date}
            </li>
          ))}
        </ul>

        <h3>Upload New Scan</h3>
        <form onSubmit={handleScanUpload}>
          <div>
            <label htmlFor="folder">Folder:</label>
            <input type="text" id="folder" name="folder" required />
          </div>
          <div>
            <label htmlFor="patientEmail">Patient Email:</label>
            <input type="email" id="patientEmail" name="patientEmail" required />
          </div>
          <div>
            <label htmlFor="scanFile">Scan File:</label>
            <input type="file" id="scanFile" name="scanFile" required />
          </div>
          <button type="submit">Upload</button>
        </form>
      </div>

      <div className="right-panel">
        <h2>Selected Scan Details</h2>
        <p>This area can display a preview or details about the selected scan.</p>
      </div>
    </div>
  );
};

export default PhysiciansHome;
