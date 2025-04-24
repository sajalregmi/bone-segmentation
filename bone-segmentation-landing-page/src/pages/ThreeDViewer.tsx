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

interface ModelDimensions {
  longestLength: number;
  widestWidth: number;
  ratio: number;
}

const ThreeDViewer: React.FC = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const filePath = queryParams.get('file'); // e.g. "http://127.0.0.1:8000/media/stl_models/..."
  const { segmentationId } = useParams();
  console.log('Segmentation ID:', segmentationId);

  // Scan details from the backend
  const [scan, setScan] = useState<ScanDetails | null>(null);
  // Model dimensions state (in millimeters)
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Fetch scan details if available
  useEffect(() => {
    if (!segmentationId) return;
    
    const fetchScanDetails = async () => {
      try {
        console.log('Fetching scan details for ID:', segmentationId);
        const res = await fetch(`http://127.0.0.1:8000/get-scan/${segmentationId}/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (!res.ok) {
          console.error('Failed to fetch scan details:', res.statusText);
          throw new Error(`Could not fetch scan details for ID ${segmentationId}`);
        }
        const data = await res.json();
        console.log('Scan details:', data);
        setScan(data);
      } catch (err: any) {
        console.error('Error fetching scan details:', err);
      }
    };
    
    fetchScanDetails();
  }, [segmentationId]);

  // Set up the THREE.js scene
  useEffect(() => {
    if (!filePath) return;
    
    // Create scene and camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 200);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
    
    // Basic lighting: ambient and directional light for a standard appearance.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    
    // Orbit controls for easy navigation.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    const loader = new STLLoader();
    const modelURL = decodeURIComponent(filePath);
    let modelMesh: THREE.Mesh | null = null;
    
    loader.load(
      modelURL,
      (geometry) => {
        const material = new THREE.MeshLambertMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        });
    
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
    
        // Create mesh
        modelMesh = new THREE.Mesh(geometry, material);
        modelMesh.rotation.x = -Math.PI / 2;
        geometry.center();
    
        // Scale or dimension handling (your existing logic here)...
    
        // Add mesh to scene
        scene.add(modelMesh);
    
        // === Add bounding box helper ===
        const bbox = new THREE.Box3().setFromObject(modelMesh);
        const bboxHelper = new THREE.Box3Helper(bbox, new THREE.Color(0xff0000));
        scene.add(bboxHelper);

        const axesHelper = new THREE.AxesHelper(50); // 50 = size of the axes
scene.add(axesHelper);


        const boundingBox = geometry.boundingBox;
        if (boundingBox) {
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          const longestLength = Math.max(size.x, size.y, size.z);
          const dimsArray = [size.x, size.y, size.z];
          dimsArray.sort((a, b) => b - a); // sort in descending order
          const widestWidth = dimsArray[1] || 0;
          const ratio = widestWidth > 0 ? longestLength / widestWidth : 0;
          setDimensions({ longestLength, widestWidth, ratio });
        }
    
        setIsLoadingModel(false);
      },
      undefined,
      (error: any) => {
        console.error('Error loading STL file:', error);
        setLoadError('Failed to load 3D model.');
      }
    );
    
    // Animation loop.
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Resize handling.
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Clean up resources on unmount.
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [filePath]);
  
  if (!filePath) {
    return <div style={{ color: 'black' }}>No file path provided.</div>;
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
            color: '#000',
            padding: '1rem',
            backgroundColor: 'rgba(255,255,255,0.8)',
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
            backgroundColor: 'rgba(255,255,255,0.8)',
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
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 10,
            maxWidth: '300px',
            fontSize: '0.9rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Scan Details</h4>
          <p style={{ margin: 0 }}><strong>ID:</strong> {scan.segmentation_id}</p>
          <p style={{ margin: 0 }}><strong>Patient:</strong> {scan.patient_email}</p>
          <p style={{ margin: 0 }}>
            <strong>Thresholds:</strong> [{scan.lower_threshold}, {scan.upper_threshold}]
          </p>
          <p style={{ margin: 0 }}><strong>Created:</strong> {scan.created_at}</p>
          {dimensions && (
            <>
              <p style={{ margin: 0 }}>
                <strong>Longest Length (mm):</strong> {dimensions.longestLength.toFixed(2)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Widest Width (mm):</strong> {dimensions.widestWidth.toFixed(2)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Ratio (Length/Widest):</strong> {dimensions.ratio.toFixed(2)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreeDViewer;
