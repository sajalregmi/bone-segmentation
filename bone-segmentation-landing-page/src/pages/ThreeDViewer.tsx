import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; 
import { useLocation, useParams } from 'react-router-dom';

interface ScanDetails {
  segmentation_id: number;
  patient_email: string;
  lower_threshold: number;
  upper_threshold: number;
  created_at: string;
}

const ThreeDViewer: React.FC = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const filePath = queryParams.get('file');  // e.g. "http://127.0.0.1:8000/media/stl_models/..."
    const { segmentationId } = useParams(); 
  const [scan, setScan] = useState<ScanDetails | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!segmentationId) return;
    
    const fetchScanDetails = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/get-scan/${segmentationId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!res.ok) {
          throw new Error(`Could not fetch scan details for ID ${segmentationId}`);
        }
        const data = await res.json();
        setScan(data);
      } catch (err: any) {
        console.error('Error fetching scan details:', err);
      }
    };
    
    fetchScanDetails();
  }, [segmentationId]);

  useEffect(() => {
    if (!filePath) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); 
    
    const camera = new THREE.PerspectiveCamera(
      50, // FOV
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    const loader = new STLLoader();
    const modelURL = decodeURIComponent(filePath);

    let modelMesh: THREE.Mesh | null = null;

    loader.load(
      modelURL,
      (geometry) => {
        const material = new THREE.MeshPhongMaterial({ color: 0xa0a0a0 });
        modelMesh = new THREE.Mesh(geometry, material);
        geometry.center();
        modelMesh.scale.set(0.5, 0.5, 0.5);
        modelMesh.rotation.x = -Math.PI / 2;
        scene.add(modelMesh);
        setIsLoadingModel(false);
      },
      undefined,
      (error: any) => {
        console.error('Error loading STL file:', error);
        setLoadError('Failed to load 3D model.');
      }
    );

    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);

      // Let's do a slow rotation if the model is loaded
      if (modelMesh) {
        modelMesh.rotation.y += 0.01;
      }

      controls.update(); 
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [filePath]);

  if (!filePath) {
    return <div style={{ color: 'white' }}>No file path provided.</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {isLoadingModel && !loadError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            padding: '1rem',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '8px'
          }}
        >
          Loading 3D model...
        </div>
      )}
      {loadError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'red',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '1rem',
            borderRadius: '8px'
          }}
        >
          {loadError}
        </div>
      )}

      {scan && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '0.5rem 1rem',
            borderRadius: '4px'
          }}
        >
          <h4>Scan Details</h4>
          <p>Segmentation ID: {scan.segmentation_id}</p>
          <p>Patient Email: {scan.patient_email}</p>
          <p>Threshold Range: [{scan.lower_threshold}, {scan.upper_threshold}]</p>
          <p>Created: {scan.created_at}</p>
        </div>
      )}
    </div>
  );
};

export default ThreeDViewer;
