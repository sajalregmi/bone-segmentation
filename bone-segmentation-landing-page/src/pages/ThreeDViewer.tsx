// src/pages/ThreeDViewer.tsx

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useParams } from 'react-router-dom';

const ThreeDViewer = () => {
  // Grab the filePath from URL params, e.g., /view-3d/my_bone_model_stl.stl
  const { filePath } = useParams();

  // We'll render the scene into this DOM node
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filePath) {
      return;
    }

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // You can tweak the aspect ratio/fov as needed
    const camera = new THREE.PerspectiveCamera(
      50, // FOV
      window.innerWidth / window.innerHeight, // aspect ratio
      0.1, // near
      1000 // far
    );
    camera.position.set(0, 0, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Append renderer to our ref's DOM node
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // 3. Add some basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // 4. Load the STL model
    const loader = new STLLoader();
    // If you’re loading a local file (on a Mac in Downloads folder, e.g.),
    // you’ll need to serve it or use a valid URL. 
    // For demonstration, let's assume an absolute or server URL:
    const modelURL = decodeURIComponent(filePath);

    loader.load(
      modelURL,
      (geometry: any) => {
        // Build a mesh from the geometry
        const material = new THREE.MeshPhongMaterial({ color: 0xa0a0a0 });
        const mesh = new THREE.Mesh(geometry, material);

        // Center the geometry
        geometry.center();

        // Scale the geometry a bit (optional)
        mesh.scale.set(0.5, 0.5, 0.5);

        scene.add(mesh);
      },
      undefined,
      (error: any) => {
        console.error('Error loading STL file:', error);
      }
    );

    // 5. Animate (render) the scene
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // 6. Handle resizing
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [filePath]);

  if (!filePath) {
    return <div>No file path provided.</div>;
  }

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ThreeDViewer;
